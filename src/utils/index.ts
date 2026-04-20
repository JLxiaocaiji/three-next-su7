export const getFileSize = async (url: string): Promise<number> => {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const len = res.headers.get('content-length');
    return len ? Number(len) : 0;
  } catch {
    return 0;
  }
};
