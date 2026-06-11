import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // 强制文件存入 music/ 前缀
        if (!pathname.startsWith('music/')) {
          throw new Error('只能上传到 music/ 目录');
        }
        return {
          allowedContentTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac'],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
          expiresIn: 3600, // 1小时有效期
          addRandomSuffix: true,
          access: 'public', 
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('音频上传完成', blob.pathname, blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}