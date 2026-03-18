import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// 初始化 UTC 插件
dayjs.extend(utc);

/**
 * 通用日期时间格式化 (UTC 转 本地时间)
 */
export const formatDateTime = (date?: string | Date | number, pattern = "YYYY-MM-DD HH:mm:ss") => {
    if (!date) return "--";
    return dayjs.utc(date).local().format(pattern);
};

/**
 * 短日期时间格式化 (用于列表展示)
 * 默认格式: 03-12 14:00
 */
export const formatDateTimeShort = (date?: string | Date | number, pattern = "MM-DD HH:mm") => {
    if (!date) return "--";
    return dayjs.utc(date).local().format(pattern);
};

/**
 * 仅时间格式化 (用于实时日志)
 */
export const formatTimeOnly = (date?: string | Date | number) => {
    if (!date) return "--";
    return dayjs.utc(date).local().format("HH:mm:ss");
};

/**
 * 仅日期格式化
 */
export const formatDateOnly = (date?: string | Date | number) => {
    if (!date) return "--";
    return dayjs.utc(date).local().format("YYYY-MM-DD");
};

/**
 * 友好时长格式化 (秒 转 分:秒)
 */
export const formatDuration = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return "--";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
};

/**
 * 获取相对今天的日期字符串
 * @param monthOffset 月份偏移量
 * @param dayOffset 天数偏移量
 */
export const today = (monthOffset: number, dayOffset: number) => {
    return dayjs().add(monthOffset, 'month').add(dayOffset, 'day').format('YYYY-MM-DD');
};

/**
 * 搜索边界处理：补全日期的开始和结束 ISO 字符串
 */
export const strToDay_start = (dayStr: string) => {
    return dayjs(dayStr).startOf('day').toISOString();
};

export const strToDay_end = (dayStr: string) => {
    return dayjs(dayStr).endOf('day').toISOString();
};