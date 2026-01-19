// FILE: AdFlowPro_ui/src/utils/payloadCleaner.ts
import type { PerformActionPayload } from "@/types/api/common";

type ActionWithOptionalId = PerformActionPayload & { id?: string };

/**
 * Cleans an array of action payloads by removing unnecessary fields
 * based on the action type. This ensures a minimal and clean JSON is sent.
 * @param actions The array of actions to clean.
 * @returns A new array of cleaned PerformActionPayload objects.
 */
export const cleanupActionSequence = (actions: ActionWithOptionalId[]): PerformActionPayload[] => {
  if (!actions) return [];

  // Deep copy to avoid mutating the original array
  const actionsCopy = JSON.parse(JSON.stringify(actions));

  const validParamsByAction: Record<string, string[]> = {
    input_text: ["text"],
    tap: ["startX", "startY", "duration"],
    hover: ["startX", "startY"],
    right_click: ["startX", "startY"],
    double_click: ["startX", "startY"],
    key_down: ["keyCode"],
    key_up: ["keyCode"],
    tap_relative: ["offsetX", "offsetY"],
    conditional_tap: ["startX", "startY", "elseX", "elseY", "comparisonOperator", "leftSource", "leftValue", "rightSource", "rightValue"],
    conditional_tap_jump: ["startX", "startY", "comparisonOperator", "leftValue", "rightValue", "targetStateLabel"],
    swipe: ["startX", "startY", "endX", "endY", "duration"],
    swipe_gesture: ["direction"],
    wait: ["duration"],
    wait_random: ["minDuration", "maxDuration"],
    wait_dynamic: ["leftSource", "leftValue"],
    scroll_until: ["direction", "text", "expectedCount"],
    data_generator: ["genType", "reportLabel"],
    shell_execute: ["command", "reportLabel"],
    press_key: ["keyCode"],
    report_value: ["reportLabel", "leftSource", "leftValue"],
    calculate_value: ["reportLabel", "leftSource", "leftValue"],
    end_case: ["leftSource", "leftValue", "comparisonOperator", "rightSource", "rightValue"],
    assert_text_equals: ["text"],
    jump_to_state: ["targetStateLabel"],
    clean_app_data: ["packageName", "scope"],
    registry_reset: ["path", "key", "value"],
    force_kill_family: [],
  };

  actionsCopy.forEach((action: any) => {
    // --- Selector Cleanup ---
    const needsSelector = ["click", "long_click", "input_text", "assert_element_exists", "assert_text_equals", "hover", "right_click", "double_click"].includes(action.action);
    if (!needsSelector) {
      delete action.selector;
    } else if (action.selector) {
      const cleanedSelector = Object.entries(action.selector).reduce((acc, [key, value]) => {
        if (value !== null && value !== "" && value !== undefined) {
          (acc as any)[key] = value;
        }
        return acc;
      }, {} as any);
      if (
          Object.keys(cleanedSelector).length === 0 ||
          (Object.keys(cleanedSelector).length === 1 &&
              cleanedSelector.index === 0 &&
              !cleanedSelector.text &&
              !cleanedSelector.resourceId &&
              !cleanedSelector.contentDesc &&
              !cleanedSelector.className &&
              !cleanedSelector.xpath)
      ) {
        delete action.selector;
      } else {
        action.selector = cleanedSelector;
      }
    }

    // --- Parameters Cleanup ---
    const validParams = validParamsByAction[action.action];
    if (!validParams || !action.parameters) {
      delete action.parameters;
    } else {
      const cleanedParameters: any = {};
      for (const paramKey of validParams) {
        let val = action.parameters[paramKey];

        // Fix: For 'tap' and 'swipe', ensure 0 is treated as a valid value
        // [V15.1 Update]: Also allow 0 for conditional_tap_jump to support "logic only" mode
        // And critical fix: if value is missing for these actions, force a default 0 to prevent empty params
        if (['tap', 'swipe', 'conditional_tap_jump', 'hover', 'right_click', 'double_click'].includes(action.action) && (val === null || val === undefined)) {
             if (paramKey === 'duration') {
                 val = 1000; // Default duration for swipe
             } else {
                 val = 0;
             }
        }

        if (val !== null && val !== undefined) {
          // Defensive fix: Trim string values to remove accidental whitespace
          cleanedParameters[paramKey] = typeof val === 'string' ? val.trim() : val;
        }
      }
      if (Object.keys(cleanedParameters).length > 0) {
        action.parameters = cleanedParameters;
      } else {
        delete action.parameters;
      }
    }

    // --- Final Cleanup (remove UI-only properties) ---
    delete action.id;
  });

  return actionsCopy;
};

/**
 * Cleans the scene snapshot object, removing redundant fields based on the
 * primary matcher's type and ensuring empty arrays are removed.
 * @param sceneSnapshot The scene snapshot object from the form.
 * @returns A cleaned scene snapshot object.
 */
export const cleanupSceneSnapshot = (sceneSnapshot: any) => {
  if (!sceneSnapshot) return;

  // Deep copy to avoid direct mutation
  const snapshotCopy = JSON.parse(JSON.stringify(sceneSnapshot));

  const primaryMatcher = snapshotCopy.primaryMatcher;
  if (primaryMatcher) {
    // --- Normalize Text Fields (applies to primary and nested anchor) ---
    const normalizeText = (m: any) => {
      if (!m) return;
      if (Array.isArray(m.text) && m.text.length === 0) {
        delete m.text;
      }
    };

    normalizeText(primaryMatcher);
    if (primaryMatcher.spatialRelation?.anchorMatcher) {
      normalizeText(primaryMatcher.spatialRelation.anchorMatcher);
    }

    // --- Eliminate Redundant Fields Based on Matcher Type ---
    if (primaryMatcher.matchTargetType === "image") {
      // If it's an image match, remove all text-related and irrelevant filter fields
      delete primaryMatcher.sceneType;
      delete primaryMatcher.text;
      delete primaryMatcher.matchMode;
      delete primaryMatcher.coordinates;
      delete primaryMatcher.spatialRelation;
      // Also remove secondary matchers completely for image mode
      delete snapshotCopy.secondaryMatchers;
    } else {
      // Default to 'text'
      // If it's a text match, remove all image-related fields
      delete primaryMatcher.templateId;
      delete primaryMatcher.matchThreshold;
      delete primaryMatcher.imageMatchStrategy;
      if (primaryMatcher.matchMode !== "fuzzy_with_coords") {
        delete primaryMatcher.coordinates;
      }
    }

    if (primaryMatcher.matchTargetType === "pixel") {
      delete primaryMatcher.sceneType;
      delete primaryMatcher.text;
      delete primaryMatcher.matchMode;
      delete primaryMatcher.coordinates;
      delete primaryMatcher.templateId;
      delete primaryMatcher.matchThreshold;
      delete primaryMatcher.imageMatchStrategy;
    } else {
      delete snapshotCopy.primaryMatcher.pixelPoints;
    }

    if (primaryMatcher.matchTargetType === "ai_detect") {
      delete primaryMatcher.text;
      delete primaryMatcher.templateId;
      delete primaryMatcher.pixelPoints;
      delete primaryMatcher.sceneType;
      delete primaryMatcher.matchMode;
    }

    // --- General Cleanup for Primary Matcher ---
    delete primaryMatcher.publicUrl; // Always remove UI-only helper field
    if (!primaryMatcher.screenRegion) {
      delete primaryMatcher.screenRegion;
    }
    if (!primaryMatcher.spatialRelation) {
      delete primaryMatcher.spatialRelation;
    }
  }

  // --- General Cleanup for Secondary Matchers (if they exist) ---
  if (snapshotCopy.secondaryMatchers) {
    if (snapshotCopy.secondaryMatchers.length > 0) {
      snapshotCopy.secondaryMatchers.forEach((sm: any) => {
        if (Array.isArray(sm.text) && sm.text.length === 0) {
          delete sm.text;
        }
      });
    } else {
      // If the array is empty, remove the key itself.
      delete snapshotCopy.secondaryMatchers;
    }
  }

  // Clean Extractors
  if (snapshotCopy.extractors) {
    snapshotCopy.extractors = snapshotCopy.extractors.filter((e: any) => e.name && e.regex);
    if (snapshotCopy.extractors.length === 0) {
      delete snapshotCopy.extractors;
    }
  }

  return snapshotCopy;
};

export const cleanupStateCondition = (stateCondition: any) => {
  if (!stateCondition) return undefined;
  const copy = JSON.parse(JSON.stringify(stateCondition));
  const validParams: Record<string, string[]> = {
    variable_comparison: ["leftSource", "leftValue", "comparisonOperator", "rightSource", "rightValue"],
    app_foreground_check: ["expectedState"]
  };

  const paramsToKeep = validParams[copy.conditionType] || [];
  const cleanedParams: any = {};
  for (const key of paramsToKeep) {
    if (copy.parameters[key] !== undefined && copy.parameters[key] !== null && copy.parameters[key] !== '') {
      // Defensive fix: Trim string values to remove accidental whitespace
      const val = copy.parameters[key];
      cleanedParams[key] = typeof val === 'string' ? val.trim() : val;
    }
  }
  copy.parameters = cleanedParams;
  return copy;
};