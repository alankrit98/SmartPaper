const LOG_LEVELS = { ERROR: "ERROR", WARN: "WARN", INFO: "INFO", DEBUG: "DEBUG" };

// simple structured logger for consistent output
const formatMessage = (level, message) => {
  return `[${new Date().toISOString()}] [${level}] ${message}`;
};

const logger = {
  info: (message) => console.log(formatMessage(LOG_LEVELS.INFO, message)),
  warn: (message) => console.warn(formatMessage(LOG_LEVELS.WARN, message)),
  error: (message) => console.error(formatMessage(LOG_LEVELS.ERROR, message)),
  debug: (message) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatMessage(LOG_LEVELS.DEBUG, message));
    }
  },
};

export default logger;
