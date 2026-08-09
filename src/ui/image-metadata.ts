export interface ImageMetadata {
  alt: string;
  caption: string;
}

export interface ImageMetadataDialog {
  open(initial: ImageMetadata, focus: keyof ImageMetadata): Promise<ImageMetadata | null>;
}

export function initImageMetadataDialog(): ImageMetadataDialog {
  const dlg = document.querySelector<HTMLDialogElement>('#imageMetaDlg')!;
  const altInput = document.querySelector<HTMLInputElement>('#imageAltInput')!;
  const captionInput = document.querySelector<HTMLTextAreaElement>('#imageCaptionInput')!;
  const cancelButton = document.querySelector<HTMLButtonElement>('#imageMetaCancel')!;
  const saveButton = document.querySelector<HTMLButtonElement>('#imageMetaSave')!;
  let resolver: ((value: ImageMetadata | null) => void) | null = null;

  function finish(value: ImageMetadata | null): void {
    if (dlg.open) dlg.close();
    const resolve = resolver;
    resolver = null;
    resolve?.(value);
  }

  cancelButton.addEventListener('click', () => finish(null));
  dlg.addEventListener('cancel', (event) => {
    event.preventDefault();
    finish(null);
  });
  saveButton.addEventListener('click', () => {
    finish({
      alt: altInput.value.trim(),
      caption: captionInput.value.trim(),
    });
  });

  return {
    open(initial, focus) {
      if (resolver) finish(null);
      altInput.value = initial.alt;
      captionInput.value = initial.caption;
      dlg.showModal();
      const target = focus === 'caption' ? captionInput : altInput;
      requestAnimationFrame(() => {
        target.focus();
        target.select();
      });
      return new Promise((resolve) => {
        resolver = resolve;
      });
    },
  };
}
