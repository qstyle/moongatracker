import { Injectable } from '@nestjs/common';
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env['S3_BUCKET'] ?? '';
    this.client = new S3Client({
      endpoint: process.env['S3_ENDPOINT'],
      region: process.env['S3_REGION'] ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env['S3_ACCESS_KEY'] ?? '',
        secretAccessKey: process.env['S3_SECRET_KEY'] ?? '',
      },
      forcePathStyle: true, // needed for MinIO / non-AWS S3
    });
  }

  async presignPut(
    key: string,
    mimeType: string,
    size: number,
  ): Promise<string> {
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
      ContentLength: size,
    });
    return getSignedUrl(this.client, cmd, { expiresIn: 300 }); // 5 min
  }

  async presignGet(key: string): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn: 3600 }); // 1 hour
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
