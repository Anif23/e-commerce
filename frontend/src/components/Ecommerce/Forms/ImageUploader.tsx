import { Upload, X } from "lucide-react";

type Props = {
  onChange: (files: FileList | null) => void;
  images: string[];
  onRemove: (index: number) => void;
};

const ImageUploader = ({ onChange, images, onRemove }: Props) => {

  return (
    <div className="space-y-4">
      <label className="border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
        <Upload size={28} className="text-gray-400" />
        <p className="mt-2 font-medium">Upload Images</p>
        <p className="text-xs text-gray-400">PNG / JPG / WEBP</p>

        <input
          type="file"
          multiple
          hidden
          onChange={(e) => onChange(e.target.files)}
        />
      </label>

      <div className="flex gap-3 flex-wrap">
        {images.map((src, i) => (
          <div key={i} className="relative">
            <img
              src={src}
              className="w-24 h-24 rounded-2xl object-cover border"
            />

            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageUploader;