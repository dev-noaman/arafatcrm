import { diskStorage } from "multer";
import { extname } from "path";
import { v4 as uuid } from "uuid";
import { existsSync, mkdirSync } from "fs";

const UPLOAD_DIR = "uploads/broker-docs";

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const brokerDocStorage = diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuid()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const documentFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, JPEG, PNG, and WebP files are allowed"), false);
  }
};

export const DOC_UPLOAD_LIMITS = { fileSize: 10 * 1024 * 1024 }; // 10MB
