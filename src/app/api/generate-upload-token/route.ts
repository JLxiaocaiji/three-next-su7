import { generateClientTokenFromReadWriteToken } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST() {
  // 生成一个有效期为1小时的客户端上传令牌
  const clientToken = generateClientTokenFromReadWriteToken({
    token: process.env.BLOB_READ_WRITE_TOKEN!,
    prefix: 'music/', // 所有音乐文件都存放在music/目录下
    expiresIn: 3600, // 1小时有效期
    // 限制只能上传音频文件
    allowedContentTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac'],
    // 限制单个文件最大50MB
    maxSize: 50 * 1024 * 1024,
  });

  return NextResponse.json({ clientToken });
}
