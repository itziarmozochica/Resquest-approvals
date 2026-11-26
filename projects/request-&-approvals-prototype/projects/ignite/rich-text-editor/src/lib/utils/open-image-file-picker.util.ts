const IMAGE_FILE_ACCEPT = '.png,.jpg,.jpeg,.gif,.webp';

export function openImageFilePicker(onFileSelected: (file: File) => void): void {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = IMAGE_FILE_ACCEPT;
  fileInput.style.display = 'none';

  const removeFileInput = (): void => {
    fileInput.remove();
  };

  fileInput.addEventListener(
    'change',
    () => {
      const file = fileInput.files?.[0];

      if (file) {
        onFileSelected(file);
      }

      removeFileInput();
    },
    { once: true },
  );
  fileInput.addEventListener('cancel', removeFileInput, { once: true });

  document.body.appendChild(fileInput);
  fileInput.click();
}
