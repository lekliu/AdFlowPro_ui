import { defineStore } from "pinia";
import { ref } from "vue";

export const usePrefillStore = defineStore("prefill", () => {
    // 暂存定时任务的预填数据
    const scheduledTaskData = ref<{
        suiteId: number;
        targetAppPackageName: string;
        deviceId: string;
        name: string;
    } | null>(null);

    function setScheduledTask(data: typeof scheduledTaskData.value) {
        scheduledTaskData.value = data;
    }

    // 消费数据：读取并立即清空，防止下次进入页面时误触发
    function consumeScheduledTask() {
        const data = scheduledTaskData.value;
        scheduledTaskData.value = null;
        return data;
    }

    return { setScheduledTask, consumeScheduledTask };
});