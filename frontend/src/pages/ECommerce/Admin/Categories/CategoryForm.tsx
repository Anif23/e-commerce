import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import PageHeader from "../../../../components/Ecommerce/Admin/PageHeader";
import InputField from "../../../../components/Ecommerce/Forms/InputField";
import ImageUploader from "../../../../components/Ecommerce/Forms/ImageUploader";
import SectionCard from "../../../../components/Ecommerce/Forms/SectionCard";

import {
  useAdminCategoryDetail,
  useCreateCategory,
  useUpdateCategory,
} from "../../../../hooks/admin/useAdminCategories";

const CategoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEdit = !!id;
  const categoryId = Number(id);

  const { data } = useAdminCategoryDetail(categoryId, {
    enabled: isEdit,
  }) as any;

  const create = useCreateCategory();
  const update = useUpdateCategory();

  const [name, setName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[]>([]);

  useEffect(() => {
    if (data) {
      setName(data.name || "");
      setPreview(data.image ? [data.image] : []);
    }
  }, [data]);

  const handleImage = (files: FileList | null) => {
    if (!files) return;

    const file = files[0];

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files allowed");
      return;
    }

    setImage(file);
    setPreview([URL.createObjectURL(file)]);
  };

  const removeImage = () => {
    setImage(null);
    setPreview([]);
  };

  const submit = (e: any) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("name", name);

    if (image) {
      fd.append("image", image);
    }

    const mutation = isEdit ? update : create;

    mutation.mutate(
      isEdit ? { id: categoryId, data: fd } : fd,
      {
        onSuccess: () => navigate(-1),
      }
    );
  };

  return (
    <div className="space-y-6">

      <PageHeader
        title={isEdit ? "Edit Category" : "Create Category"}
        subtitle="Manage product categories for your store"
        buttonText="Back"
        onClick={() => navigate(-1)}
      />

      <form onSubmit={submit} className="max-w-2xl mx-auto space-y-6">

        <SectionCard title="Category Details">

          <InputField
            label="Category Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter category name"
          />

        </SectionCard>

        <SectionCard title="Category Image">

          <ImageUploader
            images={preview}
            onChange={handleImage}
            onRemove={removeImage}
          />

        </SectionCard>

        <button
          disabled={create.isPending || update.isPending}
          className="w-full h-12 bg-black text-white rounded-2xl font-semibold hover:opacity-90"
        >
          {isEdit
            ? update.isPending
              ? "Updating..."
              : "Update Category"
            : create.isPending
              ? "Creating..."
              : "Create Category"}
        </button>

      </form>
    </div>
  );
};

export default CategoryForm;