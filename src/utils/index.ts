export const getFileSize = async (url: string): Promise<number> => {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const len = res.headers.get('content-length');
    return len ? Number(len) : 0;
  } catch {
    return 0;
  }
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay = 100
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
