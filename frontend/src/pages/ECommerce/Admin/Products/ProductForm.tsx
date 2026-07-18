import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import PageHeader from "../../../../components/Ecommerce/Admin/PageHeader";
import InputField from "../../../../components/Ecommerce/Forms/InputField";
import SelectField from "../../../../components/Ecommerce/Forms/SelectField";
import TextAreaField from "../../../../components/Ecommerce/Forms/TextAreaField";
import SectionCard from "../../../../components/Ecommerce/Forms/SectionCard";
import ImageUploader from "../../../../components/Ecommerce/Forms/ImageUploader";

import {
  useAdminProductDetail,
  useCreateProduct,
  useUpdateProduct,
} from "../../../../hooks/admin/useAdminProducts";

import { useAdminCategories } from "../../../../hooks/admin/useAdminCategories";

const ProductForm = () => {
  const navigate =
    useNavigate();

  const { id } =
    useParams();

  const isEdit = !!id;

  const productId =
    Number(id);

  const {
    data: product,
    isLoading,
  } =
    useAdminProductDetail(
      productId
    );

  const {
    data: categoriesData,
  } =
    useAdminCategories();

  const categories = categoriesData?.data || [];

  const createProduct =
    useCreateProduct();

  const updateProduct =
    useUpdateProduct();

  const [form, setForm] =
    useState<any>({
      name: "",
      price: "",
      stock: "",
      lowStock: "5",
      categoryId: "",
      description: "",
      discountType: "",
      discountValue: "",
      discountStart: "",
      discountEnd: "",
      isActive: true,
      isFeatured: false,
    });

  const [images, setImages] =
    useState<File[]>([]);

  const [preview, setPreview] =
    useState<string[]>([]);

  const [
    existingImages,
    setExistingImages,
  ] = useState<any[]>([]);

  const [
    deleteImages,
    setDeleteImages,
  ] = useState<number[]>([]);

  const updateField = (
    key: string,
    value: any
  ) =>
    setForm((p: any) => ({
      ...p,
      [key]: value,
    }));

  useEffect(() => {
    if (
      product &&
      isEdit
    ) {
      setForm({
        name:
          product.name || "",
        price:
          product.price || "",
        stock:
          product.stock || "",
        lowStock:
          product.lowStock ||
          "5",
        categoryId:
          product.categoryId ||
          "",
        description:
          product.description ||
          "",
        discountType:
          product.discountType ||
          "",
        discountValue:
          product.discountValue ||
          "",
        discountStart:
          product.discountStart
            ?.slice(
              0,
              10
            ) || "",
        discountEnd:
          product.discountEnd
            ?.slice(
              0,
              10
            ) || "",
        isActive:
          product.isActive,
        isFeatured:
          product.isFeatured,
      });

      setExistingImages(
        product.images ||
        []
      );

      setPreview([]);
    }
  }, [product, isEdit]);

  const handleImages = (
    files: FileList | null
  ) => {
    if (!files) return;

    const arr =
      Array.from(files);

    setImages((p) => [
      ...p,
      ...arr,
    ]);

    setPreview((p) => [
      ...p,
      ...arr.map((f) =>
        URL.createObjectURL(
          f
        )
      ),
    ]);
  };

  const removeExisting =
    (
      imgId: number
    ) => {
      setDeleteImages(
        (p) => [
          ...p,
          imgId,
        ]
      );

      setExistingImages(
        (p) =>
          p.filter(
            (
              img
            ) =>
              img.id !==
              imgId
          )
      );
    };

  const removeNew =
    (
      index: number
    ) => {
      setImages((p) =>
        p.filter(
          (
            _,
            i
          ) =>
            i !== index
        )
      );

      setPreview((p) =>
        p.filter(
          (
            _,
            i
          ) =>
            i !== index
        )
      );
    };

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const fd =
      new FormData();

    Object.entries(
      form
    ).forEach(
      ([
        key,
        value,
      ]) =>
        fd.append(
          key,
          String(
            value
          )
        )
    );

    images.forEach(
      (img) =>
        fd.append(
          "images",
          img
        )
    );

    deleteImages.forEach(
      (id) =>
        fd.append(
          "deleteImages",
          String(
            id
          )
        )
    );

    const mutation =
      isEdit
        ? updateProduct
        : createProduct;

    mutation.mutate(
      isEdit
        ? {
          id:
            productId,
          data: fd,
        }
        : fd,
      {
        onSuccess:
          () =>
            navigate(
              -1
            ),
      }
    );
  };

  if (
    isEdit &&
    isLoading
  )
    return (
      <div>
        Loading...
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          isEdit
            ? "Edit Product"
            : "Create Product"
        }
        subtitle="Manage product details"
        buttonText="Back"
        onClick={() =>
          navigate(
            -1
          )
        }
      />

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-6"
      >
        <SectionCard title="Basic Info">
          <div className="grid md:grid-cols-2 gap-4">
            <InputField
              label="Name"
              value={
                form.name
              }
              onChange={(
                e: React.ChangeEvent<HTMLInputElement>
              ) =>
                updateField(
                  "name",
                  e.target
                    .value
                )
              }
            />

            <InputField
              label="Price"
              type="number"
              value={
                form.price
              }
              onChange={(
                e: React.ChangeEvent<HTMLInputElement>
              ) =>
                updateField(
                  "price",
                  e.target
                    .value
                )
              }
            />

            <InputField
              label="Stock"
              type="number"
              value={
                form.stock
              }
              onChange={(
                e: React.ChangeEvent<HTMLInputElement>
              ) =>
                updateField(
                  "stock",
                  e.target
                    .value
                )
              }
            />

            <InputField
              label="Low Stock"
              type="number"
              value={
                form.lowStock
              }
              onChange={(
                e: React.ChangeEvent<HTMLInputElement>
              ) =>
                updateField(
                  "lowStock",
                  e.target
                    .value
                )
              }
            />

            <SelectField
              label="Category"
              value={
                form.categoryId
              }
              onChange={(
                e: React.ChangeEvent<HTMLSelectElement>
              ) =>
                updateField(
                  "categoryId",
                  e.target
                    .value
                )
              }
              options={categories.map(
                (
                  cat : any
                ) => ({
                  label:
                    cat.name,
                  value:
                    cat.id,
                })
              )}
            />
          </div>

          <TextAreaField
            label="Description"
            value={
              form.description
            }
            onChange={(
              e: React.ChangeEvent<HTMLTextAreaElement>
            ) =>
              updateField(
                "description",
                e.target
                  .value
              )
            }
          />
        </SectionCard>

        <SectionCard title="Discount">
          <div className="grid md:grid-cols-2 gap-4">
            <SelectField
              label="Type"
              value={
                form.discountType
              }
              onChange={(
                e: React.ChangeEvent<HTMLSelectElement>
              ) =>
                updateField(
                  "discountType",
                  e.target
                    .value
                )
              }
              options={[
                {
                  label:
                    "No Discount",
                  value:
                    "",
                },
                {
                  label:
                    "Percentage",
                  value:
                    "PERCENTAGE",
                },
                {
                  label:
                    "Fixed",
                  value:
                    "FIXED",
                },
              ]}
            />

            <InputField
              label="Value"
              type="number"
              value={
                form.discountValue
              }
              onChange={(
                e: React.ChangeEvent<HTMLInputElement>
              ) =>
                updateField(
                  "discountValue",
                  e.target
                    .value
                )
              }
            />

            <InputField
              label="Start Date"
              type="date"
              value={
                form.discountStart
              }
              onChange={(
                e: React.ChangeEvent<HTMLInputElement>
              ) =>
                updateField(
                  "discountStart",
                  e.target
                    .value
                )
              }
            />

            <InputField
              label="End Date"
              type="date"
              value={
                form.discountEnd
              }
              onChange={(
                e: React.ChangeEvent<HTMLInputElement>
              ) =>
                updateField(
                  "discountEnd",
                  e.target
                    .value
                )
              }
            />
          </div>
        </SectionCard>

        <SectionCard title="Images">
          {/* existing */}
          {existingImages
            .length >
            0 && (
              <div className="flex gap-3 flex-wrap mb-4">
                {existingImages.map(
                  (
                    img
                  ) => (
                    <div
                      key={
                        img.id
                      }
                      className="relative"
                    >
                      <img
                        src={
                          img.url
                        }
                        className="w-24 h-24 rounded-2xl object-cover border"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeExisting(
                            img.id
                          )
                        }
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs"
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

          {/* new uploader */}
          <ImageUploader
            images={
              preview
            }
            onChange={
              handleImages
            }
            onRemove={
              removeNew
            }
          />
        </SectionCard>

        <button className="w-full h-12 bg-black text-white rounded-2xl">
          {isEdit
            ? "Update Product"
            : "Create Product"}
        </button>
      </form>
    </div>
  );
};

export default ProductForm;