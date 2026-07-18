import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";

import {
  User,
  Heart,
  ShoppingCart,
  Package,
  Lock,
  Save,
  MapPin,
  Plus,
  Trash2,
  Pencil,
  Check,
} from "lucide-react";

import toast from "react-hot-toast";

import StatsCard from "../../../../components/Ecommerce/StatsCard";
import InputField from "../../../../components/Ecommerce/Forms/InputField";
import Modal from "../../../../components/Ecommerce/Modal";

import {
  useProfile,
  useUpdateProfile,
  useChangePassword,
} from "../../../../hooks/user/useProfile";

import {
  useAddresses,
  useAddAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from "../../../../hooks/user/useAddresses";

const emptyAddress = {
  fullName: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  country: "",
  zipCode: "",
};

const UserProfile = () => {

  const {
    data: user,
    isLoading,
  } = useProfile();

  const {
    data: addresses = [],
  } = useAddresses();

  const updateProfile =
    useUpdateProfile();

  const changePassword =
    useChangePassword();

  const addAddress =
    useAddAddress();

  const updateAddress =
    useUpdateAddress();

  const deleteAddress =
    useDeleteAddress();

  const setDefault =
    useSetDefaultAddress();

  const [profile, setProfile] =
    useState({
      username: "",
      email: "",
    });

  const [password, setPassword] =
    useState({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [open, setOpen] =
    useState(false);

  const [editId, setEditId] =
    useState<number | null>(null);

  const [address, setAddress] =
    useState(emptyAddress);

  useEffect(() => {

    if (user) {

      setProfile({
        username:
          user.username || "",
        email:
          user.email || "",
      });
    }

  }, [user]);

  const handleProfile = () => {

    if (
      !profile.username ||
      !profile.email
    ) {
      return toast.error(
        "Username and email required"
      );
    }

    updateProfile.mutate(
      profile
    );
  };

  const handlePassword = () => {

    if (
      !password.oldPassword ||
      !password.newPassword ||
      !password.confirmPassword
    ) {
      return toast.error(
        "All fields required"
      );
    }

    if (
      password.newPassword !==
      password.confirmPassword
    ) {
      return toast.error(
        "Passwords do not match"
      );
    }

    changePassword.mutate(
      {
        oldPassword:
          password.oldPassword,

        newPassword:
          password.newPassword,
      },
      {
        onSuccess: () =>
          setPassword({
            oldPassword: "",
            newPassword: "",
            confirmPassword: "",
          }),
      }
    );
  };

  const handleAddress = () => {

    const fn = editId
      ? updateAddress.mutate
      : addAddress.mutate;

    const payload = editId
      ? {
        id: editId,
        data: address,
      }
      : address;

    fn(payload as any, {
      onSuccess: () => {

        setOpen(false);

        setEditId(null);

        setAddress(
          emptyAddress
        );
      },
    });
  };

  const openEdit = (
    item: any
  ) => {

    setEditId(item.id);

    setAddress({
      fullName:
        item.fullName,
      phone:
        item.phone,
      address1:
        item.address1,
      address2:
        item.address2 || "",
      city: item.city,
      state:
        item.state,
      country:
        item.country,
      zipCode:
        item.zipCode,
    });

    setOpen(true);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="space-y-6">

          <div className="bg-white rounded-3xl border shadow-sm p-6 text-center">

            <div className="w-24 h-24 rounded-full bg-black text-white text-3xl font-bold flex items-center justify-center mx-auto">
              {user.username
                ?.charAt(0)
                .toUpperCase()}
            </div>

            <h2 className="mt-4 text-2xl font-bold">
              {user.username}
            </h2>

            <p className="text-gray-500">
              {user.email}
            </p>

          </div>

          <div className="grid grid-rows-3 gap-4">

            <StatsCard
              title="Cart"
              value={
                user.cartCount || 0
              }
              icon={
                <ShoppingCart size={18} />
              }
            />

            <StatsCard
              title="Wishlist"
              value={
                user.wishlistCount || 0
              }
              icon={
                <Heart size={18} />
              }
            />

            <StatsCard
              title="Orders"
              value={
                user.orderCount || 0
              }
              icon={
                <Package size={18} />
              }
            />

          </div>

        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2 space-y-6">

          {/* PROFILE */}
          <div className="bg-white rounded-3xl border shadow-sm p-6">

            <div className="flex items-center gap-2 mb-5">
              <User size={18} />
              <h2 className="text-xl font-bold">
                Update Profile
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">

              <InputField
                label="User Name"
                value={
                  profile.username
                }
                onChange={(
                  e: ChangeEvent<HTMLInputElement>
                ) =>
                  setProfile({
                    ...profile,
                    username:
                      e.target.value,
                  })
                }
              />

              <InputField
                label="Email"
                type="email"
                value={
                  profile.email
                }
                onChange={(
                  e: ChangeEvent<HTMLInputElement>
                ) =>
                  setProfile({
                    ...profile,
                    email:
                      e.target.value,
                  })
                }
              />

            </div>

            <button
              onClick={
                handleProfile
              }
              className="mt-5 h-12 px-6 rounded-2xl bg-black text-white flex items-center gap-2"
            >
              <Save size={16} />
              Save Changes
            </button>

          </div>

          {/* PASSWORD */}
          <div className="bg-white rounded-3xl border shadow-sm p-6">

            <div className="flex items-center gap-2 mb-5">
              <Lock size={18} />
              <h2 className="text-xl font-bold">
                Change Password
              </h2>
            </div>

            <div className="grid gap-4">

              {[
                "oldPassword",
                "newPassword",
                "confirmPassword",
              ].map((field) => (

                <InputField
                  key={field}
                  label={field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                  type="password"
                  value={
                    password[
                    field as keyof typeof password
                    ]
                  }
                  onChange={(e) =>
                    setPassword({
                      ...password,
                      [field]:
                        e.target.value,
                    })
                  }
                />

              ))}

            </div>

            <button
              onClick={
                handlePassword
              }
              className="mt-5 h-12 px-6 rounded-2xl bg-black text-white"
            >
              Update Password
            </button>

          </div>

          {/* ADDRESS */}
          <div className="bg-white rounded-3xl border shadow-sm p-6">

            <div className="flex items-center justify-between mb-5">

              <div className="flex items-center gap-2">
                <MapPin size={18} />

                <h2 className="text-xl font-bold">
                  Addresses
                </h2>
              </div>

              <button
                onClick={() => {
                  setOpen(true);
                  setEditId(null);
                  setAddress(
                    emptyAddress
                  );
                }}
                className="h-11 px-4 rounded-2xl bg-black text-white flex items-center gap-2"
              >
                <Plus size={16} />
                Add Address
              </button>

            </div>

            <div className="grid gap-4">

              {addresses.length === 0 && (
                <p className="text-gray-500">
                  No addresses found.
                </p>
              )}

              {addresses.map(
                (item: any) => (

                  <div
                    key={item.id}
                    className="border rounded-3xl p-5 bg-gray-50"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <div className="flex items-center gap-2">

                          <h3 className="font-bold">
                            {
                              item.fullName
                            }
                          </h3>

                          {item.isDefault && (
                            <span className="px-2 py-1 rounded-full text-xs bg-black text-white">
                              Default
                            </span>
                          )}

                        </div>

                        <p className="text-sm text-gray-500 mt-1">
                          {item.phone}
                        </p>

                        <p className="text-sm mt-3 text-gray-700">
                          {item.address1},{" "}
                          {
                            item.address2
                          }
                          , {item.city},{" "}
                          {item.state},{" "}
                          {
                            item.country
                          }{" "}
                          -{" "}
                          {
                            item.zipCode
                          }
                        </p>

                      </div>

                      <div className="flex items-center gap-2">

                        {!item.isDefault && (
                          <button
                            onClick={() =>
                              setDefault.mutate(
                                item.id
                              )
                            }
                            className="w-10 h-10 rounded-2xl border flex items-center justify-center"
                          >
                            <Check size={16} />
                          </button>
                        )}

                        <button
                          onClick={() =>
                            openEdit(
                              item
                            )
                          }
                          className="w-10 h-10 rounded-2xl border flex items-center justify-center"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                "Are you sure you want to delete this address?"
                              )
                            ) {
                              deleteAddress.mutate(
                                item.id
                              )
                            }
                          }}
                          className="w-10 h-10 rounded-2xl border text-red-500 flex items-center justify-center"
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

        </div>

      </div>

      {/* ADDRESS MODAL */}
      <Modal
        open={open}
        onClose={() =>
          setOpen(false)
        }
        title={
          editId
            ? "Update Address"
            : "Add Address"
        }
      >

        <div className="grid gap-4">

          {Object.keys(
            emptyAddress
          ).map((key) => (

            <InputField
              key={key}
              label={key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
              value={
                address[
                key as keyof typeof address
                ]
              }
              onChange={(e) =>
                setAddress({
                  ...address,
                  [key]:
                    e.target.value,
                })
              }
            />

          ))}

          <button
            onClick={
              handleAddress
            }
            className="h-12 rounded-2xl bg-black text-white"
          >
            {editId
              ? "Update Address"
              : "Save Address"}
          </button>

        </div>

      </Modal>

    </div>
  );
};

export default UserProfile;