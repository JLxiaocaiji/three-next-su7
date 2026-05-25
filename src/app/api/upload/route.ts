import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// 配置文件大小限制和允许的MIME类型
export const config = {
  api: {
    bodyParser: false,
  },
};

// 音频类型
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg', // .mp3
  'audio/wav', // .wav
  'audio/ogg', // .ogg
  'audio/flac', // .flac
];

// 最大50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      return NextResponse.json({ error: '没有选择文件' }, { status: 400 });
    }

    // 验证文件类型
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件格式，请上传MP3、WAV、OGG或FLAC文件' },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '文件大小不能超过50MB' }, { status: 400 });
    }

    // 确保uploads目录存在
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, '_');
    const fileName = `${timestamp}_${originalName}`;
    const filePath = join(uploadDir, fileName);

    // 写入文件
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // 返回文件URL
    const fileUrl = `/uploads/${fileName}`;
    return NextResponse.json({
      success: true,
      url: fileUrl,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error('上传失败:', error);
    return NextResponse.json({ error: '服务器错误，上传失败' }, { status: 500 });
  }
}
