import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: '缺少文件URL' }, { status: 400 });
    }

    // 验证URL是否属于我们的Blob存储
    if (!url.startsWith(process.env.BLOB_STORE_URL!)) {
      return NextResponse.json({ error: '无效的文件URL' }, { status: 403 });
    }

    await del(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
