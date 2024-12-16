import { S3Client, PutObjectCommand, DeleteObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";

// 创建 S3 客户端时添加配置日志
const s3Config = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  endpoint: `https://s3.${process.env.AWS_REGION}.amazonaws.com`,
  forcePathStyle: false
};

console.log('Initializing S3 client with config:', {
  region: s3Config.region,
  hasAccessKey: !!s3Config.credentials.accessKeyId,
  hasSecretKey: !!s3Config.credentials.secretAccessKey,
});

const s3Client = new S3Client(s3Config);

export async function uploadToS3(
  base64Image: string,
  fileName: string
): Promise<string> {
  console.log('Starting upload process for file:', fileName);

  try {
    // 验证输入参数
    if (!base64Image) {
      throw new Error('base64Image is required');
    }
    if (!fileName) {
      throw new Error('fileName is required');
    }

    // 验证环境变量
    if (!process.env.AWS_BUCKET_NAME) {
      throw new Error('AWS_BUCKET_NAME is not configured');
    }
    if (!process.env.AWS_REGION) {
      throw new Error('AWS_REGION is not configured');
    }

    // 移除 base64 数据的前缀
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    console.log('Prepared upload parameters:', {
      bucketName: process.env.AWS_BUCKET_NAME,
      fileName: `images/${fileName}`,
      contentType: 'image/jpeg',
      bufferSize: buffer.length,
    });

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `images/${fileName}`,
      Body: buffer,
      ContentType: 'image/jpeg'
    };

    console.log('Sending upload command to S3...');
    const uploadResult = await s3Client.send(new PutObjectCommand(params));
    console.log('Upload successful:', uploadResult);

    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/images/${fileName}`;
    console.log('Generated image URL:', imageUrl);

    return imageUrl;
  } catch (error) {
    // 首先进行类型收窄
    if (error instanceof S3ServiceException) {
      console.error('Detailed S3 upload error:', {
        errorName: error.name,
        errorMessage: error.message,
        errorCode: error.$metadata?.httpStatusCode,
        errorRequestId: error.$metadata?.requestId,
        errorStack: error.stack,
        bucketName: process.env.AWS_BUCKET_NAME,
        region: process.env.AWS_REGION,
      });

      // 处理具体的 AWS 错误
      if (error.name === 'NoSuchBucket') {
        throw new Error(`Bucket ${process.env.AWS_BUCKET_NAME} does not exist`);
      } else if (error.name === 'AccessDenied') {
        throw new Error('Access denied to S3 bucket - check IAM permissions');
      } else if (error.name === 'InvalidAccessKeyId') {
        throw new Error('Invalid AWS access key - check credentials');
      } else if (error.name === 'SignatureDoesNotMatch') {
        throw new Error('Invalid AWS secret key - check credentials');
      }
    }
    
    // 处理其他类型的错误
    if (error instanceof Error) {
      throw new Error(`Failed to upload image to S3: ${error.message}`);
    }

    // 处理未知类型的错误
    throw new Error('An unknown error occurred during S3 upload');
  }
}

export async function deleteFromS3(imageUrl: string): Promise<void> {
  try {
    // 从完整的 URL 中提取文件名
    const key = imageUrl.split('.amazonaws.com/')[1];
    
    if (!process.env.AWS_BUCKET_NAME) {
      throw new Error('AWS_BUCKET_NAME is not configured');
    }

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    };

    await s3Client.send(new DeleteObjectCommand(params));
    console.log('Successfully deleted file from S3:', key);
  } catch (error) {
    if (error instanceof S3ServiceException) {
      console.error('Detailed S3 delete error:', {
        errorName: error.name,
        errorMessage: error.message,
        errorCode: error.$metadata?.httpStatusCode,
        errorRequestId: error.$metadata?.requestId,
      });
      throw new Error(`S3 deletion error: ${error.message}`);
    }
    
    if (error instanceof Error) {
      console.error('Error deleting file from S3:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
    
    // 处理未知类型的错误
    console.error('Unknown error during S3 deletion:', error);
    throw new Error('An unknown error occurred during S3 deletion');
  }
}