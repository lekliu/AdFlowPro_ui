/**
 * 兼容性剪贴板复制工具
 * 支持 HTTPS/Localhost (现代API) 和 HTTP/IP地址 (回退方案)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    // 1. 尝试使用现代 Clipboard API (要求安全上下文)
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error("现代剪贴板API访问失败:", err);
        }
    }

    // 2. 回退方案：使用传统的 textarea 模拟复制 (解决非HTTPS环境下无法复制的问题)
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // 样式处理：确保元素不可见但可操作
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        textArea.style.opacity = "0";

        document.body.appendChild(textArea);

        // 选中并执行复制
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        return successful;
    } catch (err) {
        console.error("回退方案复制失败:", err);
        return false;
    }
};
