const images = [];
const downloadBtn = document.getElementById("downloadBtn");

let originalSize = 0;
let finalSize = 0;

async function handleImages(event) {
  try {
    downloadBtn.innerText = 'Processing...';
    downloadBtn.disabled = true;
    downloadBtn.style.display = 'block';

    const input_size = document.getElementById("size").value;
    const input_pixels = document.getElementById("pixels").value;

    const files = event.target.files;
    // const compressFn = Object.values(files).map((f) => compress(f, input_size, input_pixels));
    // await Promise.all(compressFn);

    const batchSize = 10;
    const filesArr = Object.values(files);

    const totalSize = filesArr.reduce((old, curr) => old + curr.size, 0);
    const originalSize = (totalSize / 1024 / 1024).toFixed(2);

    for (let batch = 0; batch <= filesArr.length / batchSize; batch++) {
      const start = batch * batchSize;
      const end = start + batchSize;
      const compressFn = filesArr.slice(start, end).map((f) => compress(f, input_size, input_pixels));
      await Promise.all(compressFn);
    }

    // for await (const file of files) {
    //   const { size, width, height, src } = await imageResolution(file);
    //   const metadata = await getExif(file);
    //   console.log('Metadata: ', metadata);

    //   const maxPixels = width > height ? width : height;
    //   const options = {
    //     maxSizeMB: input_size ?? 1,
    //     maxWidthOrHeight: input_pixels ?? maxPixels,
    //     useWebWorker: true
    //   };

    //   let newImage = await imageCompression(file, options);

    //   const original = await blobToBase64(file);
    //   let resized = await blobToBase64(newImage);
    //   resized = await ExifRestorer.restore(original, resized);
    //   newImage = await base64ToBlob('data:image/jpeg;base64,' + resized);

    //   const metadata2 = await getExif(newImage);
    //   console.log('Metadata 2: ', metadata2);

    //   newImage.name = file.name;

    //   const {
    //     width: newWidth,
    //     height: newHeight,
    //     src: newSrc,
    //     size: newSize
    //   } = await imageResolution(newImage);

    //   const imageInfo = {
    //     src,
    //     newSrc,
    //     size,
    //     newSize,
    //     width,
    //     height,
    //     newWidth,
    //     newHeight,
    //     newImage,
    //     name: newImage.name,
    //   }

    //   images.push(imageInfo);
    //   previewImage(imageInfo);
    // }

    downloadBtn.disabled = false;
    downloadBtn.innerText = 'Download Compressed Image(s)';

    if (images.length) {
      document.getElementById("downloadBtn").classList.remove('d-none');

      const newTotalSize = images.reduce((total, curr) => total + Number(curr.newSize), 0);
      const finalSize = newTotalSize.toFixed(2);
      const percentReduced = (((originalSize - finalSize) / originalSize) * 100).toFixed(0);

      document.getElementById("original-size").innerText = originalSize + ' MB';
      document.getElementById("final-size").innerText = `${finalSize} MB (${percentReduced}%)`;
      document.getElementById("size-info").classList.remove('d-none');
    } else {
      downloadBtn.style.display = 'none';
      document.getElementById("size-info").classList.add('d-none');
    }
  } catch (error) {
    console.log(error);
    downloadBtn.disabled = false;
  }
}

async function compress(file, input_size, input_pixels) {
  const { size, width, height, src } = await imageResolution(file);

  const maxPixels = width > height ? width : height;
  const options = {
    maxSizeMB: input_size ?? 1,
    maxWidthOrHeight: input_pixels ?? maxPixels,
    useWebWorker: true
  };

  let newImage = await imageCompression(file, options);

  const original = await blobToBase64(file);
  let resized = await blobToBase64(newImage);
  resized = await ExifRestorer.restore(original, resized);

  if (!resized.includes('data:image')) {
    resized = 'data:image/jpeg;base64,' + resized;
  }
  newImage = await base64ToBlob(resized);

  newImage.name = file.name;

  const {
    width: newWidth,
    height: newHeight,
    src: newSrc,
    size: newSize
  } = await imageResolution(newImage);

  const imageInfo = {
    src,
    newSrc,
    size,
    newSize,
    width,
    height,
    newWidth,
    newHeight,
    newImage,
    name: newImage.name,
  }

  images.push(imageInfo);
  previewImage(imageInfo);
}

async function getExif(file) {
  return new Promise((resolve, reject) => {
    try {
      EXIF.getData(file, function () {
        resolve(EXIF.getAllTags(this));
      });
    } catch (err) {
      reject(err);
    }
  })
}

async function blobToBase64(blob) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function base64ToBlob(data) {
  const res = await fetch(data)
  return res.blob();
}

function previewImage(imageInfo) {
  const compressedDiv = document.getElementById("compressedBlock");
  const node = document.getElementById("image-item");
  const imageHtml = node.cloneNode(true);
  const percent = (((imageInfo.size - imageInfo.newSize) * 100) / imageInfo.size).toFixed(2);

  imageHtml.children[0].children[0].src = imageInfo.newSrc;
  imageHtml.children[0].children[1].children[0].innerHTML = imageInfo.name;
  imageHtml.children[0].children[1].children[1].innerHTML = `${imageInfo.width} x ${imageInfo.height} px, ${imageInfo.size} MB`;
  imageHtml.children[0].children[1].children[3].innerHTML = `${imageInfo.newWidth} x ${imageInfo.newHeight} px, ${imageInfo.newSize} MB (${percent}%)`;

  imageHtml.classList.remove('d-none');
  compressedDiv.prepend(imageHtml);
}

async function imageResolution(file) {
  return new Promise((resolve, reject) => {
    var img = new Image();
    img.src = window.URL.createObjectURL(file);
    img.onload = function () {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        src: img.src,
        size: (file.size / 1024 / 1024).toFixed(2)
      });
    };
    img.onerror = function () {
      reject(false);
    };
  });
}

async function downloadImages() {
  if (images.length > 0 && images.length < 2) {
    downloadSingleImage(images[0]);
  } else if (images.length > 1) {
    // code to download zip
    var zip = new JSZip();

    for await (const image of images) {
      const res = await fetch(image.newSrc);
      const blob = await res.blob();
      zip.file(image.name, blob, { blob: true });
    }

    zip.generateAsync({ type: "blob" }).then(function (content) {
      saveAs(content, "compressed.zip");
    });
  }
}

function downloadSingleImage(image) {
  const a = document.createElement("a");
  a.href = image.newSrc;
  a.target = "_blank";
  a.download = image.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
