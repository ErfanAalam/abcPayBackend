import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || "";

export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  return `https://${BUCKET}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`;
}

export async function deleteFromS3(key: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}
