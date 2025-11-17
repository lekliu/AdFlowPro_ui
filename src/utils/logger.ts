// AdFlowPro_ui/src/utils/logger.ts (新增文件)

const isDev = import.meta.env.DEV;

type LogLevel = "log" | "info" | "warn" | "error" | "debug";

class Logger {
  private prefix: string;

  constructor(prefix: string = "[AdFlowPro]") {
    this.prefix = prefix;
  }

  private print(level: LogLevel, ...args: any[]) {
    // 只在开发模式下打印日志
    if (!isDev) return;

    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}`;

    const style = `color: #409EFF; font-weight: bold;`;

    console[level](`%c${this.prefix}`, style, `[${timestamp}]`, ...args);
  }

  public log(...args: any[]) {
    this.print("log", ...args);
  }

  public info(...args: any[]) {
    this.print("info", ...args);
  }

  public warn(...args: any[]) {
    this.print("warn", ...args);
  }

  public error(...args: any[]) {
    this.print("error", ...args);
  }

  public debug(...args: any[]) {
    // debug级别的日志可以根据需要更精细地控制是否显示
    if (isDev) {
      this.print("debug", ...args);
    }
  }
}

// 创建一个全局单例
const logger = new Logger();

export default logger;
