import fs from "fs";

export const deleteFiles = (
  files = []
) => {
  const list =
    Array.isArray(files)
      ? files
      : [files];

  list.forEach((file) => {
    if (!file?.path) return;

    fs.unlink(file.path, () => {});
  });
};