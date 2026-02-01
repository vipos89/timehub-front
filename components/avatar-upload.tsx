'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface AvatarUploadProps {
    value?: string;
    thumbnail?: string;
    onChange: (avatarURL: string, thumbnailURL: string) => void;
}

export function AvatarUpload({ value, thumbnail, onChange }: AvatarUploadProps) {
    const [image, setImage] = useState<string | null>(null);
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
    const [showCropDialog, setShowCropDialog] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImage(reader.result as string);
                setShowCropDialog(true);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const onCropComplete = useCallback(() => {
        if (!completedCrop || !imgRef.current) return;

        const canvas = document.createElement('canvas');
        const image = imgRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        // Full size avatar
        canvas.width = completedCrop.width * scaleX;
        canvas.height = completedCrop.height * scaleY;

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const fullURL = canvas.toDataURL('image/jpeg', 0.9);

        // Thumbnail (150x150)
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 150;
        thumbCanvas.height = 150;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
            thumbCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 150, 150);
        }
        const thumbnailURL = thumbCanvas.toDataURL('image/jpeg', 0.8);

        onChange(fullURL, thumbnailURL);
        setShowCropDialog(false);
        setImage(null);
    }, [completedCrop, onChange]);

    return (
        <div className="space-y-2">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onSelectFile}
            />

            <div className="flex items-center gap-4">
                {thumbnail || value ? (
                    <div className="relative">
                        <img
                            src={thumbnail || value}
                            alt="Avatar"
                            className="h-20 w-20 rounded-full object-cover border-2 border-neutral-200"
                        />
                        <button
                            type="button"
                            onClick={() => onChange('', '')}
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ) : (
                    <div className="h-20 w-20 rounded-full bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-neutral-400" />
                    </div>
                )}

                <Button
                    type="button"
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                    className="border-neutral-300"
                >
                    {value ? 'Изменить фото' : 'Загрузить фото'}
                </Button>
            </div>

            <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Обрезать фотографию</DialogTitle>
                        <DialogDescription>
                            Выберите область для аватарки. Рекомендуем квадратное изображение.
                        </DialogDescription>
                    </DialogHeader>

                    {image && (
                        <div className="max-h-96 overflow-auto">
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1}
                                circularCrop
                            >
                                <img
                                    ref={imgRef}
                                    src={image}
                                    alt="Crop preview"
                                    style={{ maxHeight: '400px' }}
                                />
                            </ReactCrop>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCropDialog(false);
                                setImage(null);
                            }}
                        >
                            Отмена
                        </Button>
                        <Button onClick={onCropComplete} className="bg-neutral-900 text-white hover:bg-neutral-800">
                            Применить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
