import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";

import {
  User,
  Lock,
  Save,
} from "lucide-react";

import toast from "react-hot-toast";

import InputField from "../../../../components/Ecommerce/Forms/InputField";

import {
  useProfile,
  useUpdateProfile,
  useChangePassword,
} from "../../../../hooks/user/useProfile";

const AdminProfile = () => {

  const {
    data: user,
    isLoading,
  } = useProfile();

  const updateProfile =
    useUpdateProfile();

  const changePassword =
    useChangePassword();


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

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen">

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

        </div>

      </div>

    </div>
  );
};

export default AdminProfile;