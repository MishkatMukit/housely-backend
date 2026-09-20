import multer from 'multer'
import { AppError } from '../utils/appError';
import httpStatus from 'http-status';
const storage = multer.memoryStorage();

const ALLOWED_MIMETYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
];

export const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 4,
    },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new AppError(`Invalid file type: ${file.mimetype}. Only JPG, PNG, WEBP and PDF are allowed.`, httpStatus.BAD_REQUEST));
        }
    },
});
