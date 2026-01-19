// FILE: AdFlowPro_ui/src/utils/flowchartUtils.ts (New File)
export const getStandardAnchors = (id: string, x: number, y: number, width: number, height: number) => {
    return [
        { x: x, y: y - height / 2, id: `${id}_anchor_top`, name: 'top' },
        { x: x + width / 2, y: y, id: `${id}_anchor_right`, name: 'right' },
        { x: x, y: y + height / 2, id: `${id}_anchor_bottom`, name: 'bottom' },
        { x: x - width / 2, y: y, id: `${id}_anchor_left`, name: 'left' },
    ];
};