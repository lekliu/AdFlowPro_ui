import { defineStore } from "pinia";
import { type RouteLocationNormalized } from "vue-router";
import router from "@/router";

// 定义单个标签页的数据结构
export interface Tab {
  path: string; // 路由路径, 唯一标识
  title: string; // 标签页上显示的标题
  name: string; // 路由名称, 用于 keep-alive 的 include
  noCache?: boolean;
  icon?: string; // [新增]
}

// 定义 Store 的 State 结构
interface TabState {
  tabs: Tab[]; // 所有已打开的标签页
  activeTabPath: string; // 当前激活的标签页路径
}

// 固定的标签页，例如首页，不允许关闭
const HOME_TAB: Tab = {
  path: "/",
  title: "Dashboard",
  name: "Dashboard",
  noCache: true,
  icon: "House",
};

export const useTabStore = defineStore("tabs", {
  state: (): TabState => ({
    tabs: [HOME_TAB], // 初始时总有一个首页
    activeTabPath: HOME_TAB.path,
  }),

  getters: {
    // 为 keep-alive 提供需要缓存的组件名列表
    cachedViews(state): string[] {
      return state.tabs.filter((tab) => !tab.noCache).map((tab) => tab.name);
    },
  },

  actions: {
    /**
     * 添加一个新的标签页。如果已存在，则激活它。
     * @param route - Vue Router 的路由对象
     */
    addTab(route: RouteLocationNormalized) {
      console.log(`[TabStore] 🟢 尝试添加标签: ${route.fullPath}, 当前总数: ${this.tabs.length}`);
      // 如果没有路由名称或标题，则忽略，这些页面不适合做标签页
      // 检查 meta 是否存在，以及 title 是否为真值
      if (
          !route.name ||
          !route.meta?.title ||
          route.name === 'Login' ||
          route.meta?.hideInTabs
      ) {
        return;
      }

      const existingTab = this.tabs.find((tab) => tab.path === route.fullPath);

      if (!existingTab) {
        const title = typeof route.meta.title === "function" ? route.meta.title(route) : route.meta.title;
        this.tabs.push({
          path: route.fullPath,
          title: title,
          name: route.name as string,
          noCache: route.meta.noCache || false,
          icon: route.meta.icon as string, // [新增]
        });
      }
      
      // 如果当前已经是这个标签，不执行激活逻辑，减少渲染频率
      if (this.activeTabPath === route.fullPath) return;
      this.setActiveTab(route.fullPath);
    },

    /**
     * [新增] 退出登录时清空所有标签，仅保留首页
     */
    resetTabs() {
      this.tabs = [HOME_TAB];
      this.activeTabPath = HOME_TAB.path;
    },

    /**
     * 移除一个标签页。
     * @param path - 要移除的标签页的路径
     */
    removeTab(path: string) {
      // 首页不允许关闭
      if (path === HOME_TAB.path) {
        return;
      }

      const indexToRemove = this.tabs.findIndex((tab) => tab.path === path);
      if (indexToRemove === -1) {
        return;
      }

      // 如果要关闭的是当前激活的标签页，需要决定下一个激活哪个
      if (this.activeTabPath === path) {
        const nextTab = this.tabs[indexToRemove + 1] || this.tabs[indexToRemove - 1];
        if (nextTab) {
          this.setActiveTab(nextTab.path);
          // 关键修正: 现在这里的 router 是我们从外部导入的有效实例
          router.push(nextTab.path);
        }
      }

      this.tabs.splice(indexToRemove, 1);
    },

    /**
     * 重新设置整个标签列表（拖拽排序使用）
     * @param newTabs - 排序后的新标签数组
     */
    setTabs(newTabs: Tab[]) {
      this.tabs = newTabs;
    },

    /**
     * 拖拽排序：移动数组中的元素
     */
    reorderTabs(oldIndex: number, newIndex: number) {
        if (oldIndex === newIndex) return;

        const newTabs = [...this.tabs];
        const [movedItem] = newTabs.splice(oldIndex, 1);
        newTabs.splice(newIndex, 0, movedItem);

        // 直接整体替换，触发 Vue 的全量 Diff
        this.tabs = newTabs;
        console.log(`[TabStore] 📦 数据顺序已同步:`, this.tabs.map(t => t.title));
    },

    /**
     * 设置当前激活的标签页。
     * @param path - 要激活的标签页的路径
     */
    setActiveTab(path: string) {
      this.activeTabPath = path;
    },

    /**
     * 原地更新标签信息（用于从新建跳转到编辑，防止标签闪烁或跳回列表）
     */
    morphTab(oldPath: string, newPath: string, newTitle: string) {
      const tab = this.tabs.find((t) => t.path === oldPath);
      if (tab) {
        tab.path = newPath;
        tab.title = newTitle;
        this.activeTabPath = newPath;
      }
    },

    /**
     * 根据路径更新一个已存在标签页的标题。
     * @param path - 标签页的路径
     * @param title - 新的标题
     */
    updateTabTitle(path: string, title: string) {
      const tabToUpdate = this.tabs.find((tab) => tab.path === path);
      if (tabToUpdate) {
        tabToUpdate.title = title;
      }
    },

    /**
     * 关闭除首页外的所有标签页
     */
    closeAllTabs() {
      // 1. 重置数组，只保留 HOME_TAB
      this.tabs = [HOME_TAB];

      // 2. 激活首页路径
      this.setActiveTab(HOME_TAB.path);

      // 3. 路由跳转回首页
      router.push(HOME_TAB.path);
    },
  },
});
