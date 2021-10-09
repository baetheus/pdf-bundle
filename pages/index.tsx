// deno-lint-ignore-file no-explicit-any

import {
  useCallback,
  useState,
} from "https://deno.land/x/dext@0.10.5/deps/preact/hooks.ts";
import * as P from "https://cdn.skypack.dev/pdf-lib?dts";
import { h } from "https://deno.land/x/dext@0.10.5/deps/preact/mod.ts";
import produce from "https://cdn.skypack.dev/immer?dts";

/**
 * State
 */
type Image = {
  url: string;
  blob: Blob;
  type: string;
  caption: string;
};

type State = {
  title: string;
  author: string;
  images: Image[];
  url?: string;
};

const INITIAL_STATE: State = {
  title: "Title",
  author: "You",
  images: [],
};

/**
 * Utilities
 */
function notNil<T>(t: T): t is NonNullable<T> {
  return t !== undefined && t !== null;
}

async function makePdf(state: State): Promise<string> {
  const pdfDoc = await P.PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(P.StandardFonts.Helvetica);
  const titlePage = pdfDoc.addPage();
  const { width, height } = titlePage.getSize();

  console.log({ width, height });
  titlePage.drawText(state.title, {
    x: 50,
    y: height - 60,
    size: 30,
    font: helveticaFont,
    color: P.rgb(0, 0.53, 0.71),
  });

  titlePage.drawText(state.author, {
    x: 55,
    y: height - 77,
    size: 15,
    font: helveticaFont,
    color: P.rgb(0, 0.53, 0.71),
  });

  for (const image of state.images) {
    const buffer = await image.blob.arrayBuffer();
    const embeddedImage = image.type === "image/png"
      ? await pdfDoc.embedPng(buffer)
      : image.type === "image/jpeg"
      ? await pdfDoc.embedJpg(buffer)
      : null;

    if (embeddedImage === null) {
      break;
    }

    const page = pdfDoc.addPage();

    page.drawText(image.caption, {
      x: 50,
      y: height - 60,
      size: 15,
      font: helveticaFont,
      color: P.rgb(0, 0.53, 0.71),
    });

    const scale = embeddedImage.width > embeddedImage.height
      ? (width * 0.8) / embeddedImage.width
      : (height * 0.6) / embeddedImage.height;

    const scaled = embeddedImage.scale(scale);

    page.drawImage(embeddedImage, {
      x: page.getWidth() / 2 - scaled.width / 2,
      y: page.getHeight() / 2 - scaled.height / 2,
      width: scaled.width,
      height: scaled.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

function move<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const element = arr[fromIndex];
  arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, element);
  return arr;
}

type Movements = "up" | "down" | "top" | "bottom";

interface MoveButtonsProps {
  index: number;
  length: number;
  handler: (index: number, movement: Movements) => void;
}

function MoveButtons({ index, length, handler }: MoveButtonsProps) {
  return (
    <div style="display: flex; gap: 5px;">
      <button
        style="flex: 1 1 auto"
        onClick={() => handler(index, "top")}
        disabled={index === 0}
      >
        Top
      </button>
      <button
        style="flex: 1 1 auto"
        onClick={() => handler(index, "up")}
        disabled={index === 0}
      >
        Up
      </button>
      <button
        style="flex: 1 1 auto"
        onClick={() => handler(index, "down")}
        disabled={index - 1 === length}
      >
        Down
      </button>
      <button
        style="flex: 1 1 auto"
        onClick={() => handler(index, "bottom")}
        disabled={index - 1 === length}
      >
        Bottom
      </button>
    </div>
  );
}
/**
 * Main Page
 */
function IndexPage() {
  const [state, setState] = useState(INITIAL_STATE);

  const setTitle = useCallback((e: any) => {
    const { value } = e.target ?? { value: "" };
    return setState(produce((draft) => {
      draft.title = value;
    }));
  }, []);

  const setAuthor = useCallback((e: any) => {
    const { value } = e.target ?? { value: "" };
    return setState(produce((draft) => {
      draft.author = value;
    }));
  }, []);

  const moveImage = useCallback(
    (index: number, movement: Movements) =>
      setState(produce((draft) => {
        const image = draft.images[index];
        if (notNil(image)) {
          switch (movement) {
            case "top":
              move(draft.images, index, 0);
              break;
            case "up":
              move(draft.images, index, index - 1);
              break;
            case "down":
              move(draft.images, index, index + 1);
              break;
            case "bottom":
              move(draft.images, index, draft.images.length - 1);
              break;
          }
        }
      })),
    [],
  );

  const setImageCaption = useCallback((index: number) =>
    (e: any) => {
      const { value } = e.target ?? { value: "" };
      return setState(produce((draft) => {
        const image = draft.images[index];
        if (notNil(image)) {
          image.caption = value;
        }
      }));
    }, []);

  const addFiles = useCallback((e: any) => {
    const files: FileList = e.target.files ?? [];
    return setState(produce((draft) => {
      for (let i = 0; i < files.length; i++) {
        const blob = files.item(i);
        if (blob !== null) {
          draft.images.push({
            url: URL.createObjectURL(blob),
            blob,
            type: blob.type,
            caption: blob.name,
          });
        }
      }
    }));
  }, []);

  const removeImage = useCallback((index: number) => {
    return setState(produce(draft => {
      draft.images.splice(index, 1);
    }))
  }, [])

  const createPdf = useCallback(() => {
    makePdf(state).then((pdfUrl) => {
      setState(produce((draft) => {
        draft.url = pdfUrl;
      }));
    }).catch(console.error);
  }, [state, setState]);

  const openPdf = useCallback(() => {
    window.open(state.url, "_blank");
  }, [state.url]);

  return (
    <main
      style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 500px; min-width: 320px;"
    >
      <header>
        <h1>Pdf Bundler</h1>
        <p>Create a pdf from a collection of images.</p>
      </header>

      <section
        style="display: flex; flex-direction: column; gap: 10px;"
      >
        <label for="title">Title:</label>
        <input
          type="text"
          name="title"
          value={state.title}
          onInput={setTitle}
        />

        <label for="author">Author:</label>
        <input
          type="text"
          name="author"
          value={state.author}
          onInput={setAuthor}
        />

        <label for="images">Upload Images</label>
        <input
          type="file"
          name="images"
          accept="image/png, image/jpeg"
          multiple
          onChange={addFiles}
        >
        </input>

        <button
          onClick={createPdf}
          disabled={state.images.length === 0}
        >
          Make Pdf!
        </button>

        <button
          onClick={openPdf}
          disabled={!notNil(state.url)}
        >
          Open Pdf!
        </button>
      </section>

      <section style="padding: 5px;">
        <ul
          style="margin: 0px; padding: 0px; display: flex; flex-direction: column; gap: 5px; list-style: none;"
        >
          {state.images.map((
            image,
            index,
          ) => (
            <li
              style="padding: 5px; border: 1px solid black; border-radius: 2px; display: flex; flex-direction: column; gap: 5px; background: #dedede;"
            >
              <MoveButtons
                index={index}
                length={state.images.length}
                handler={moveImage}
              />
              <input
                type="text"
                name={`image-${index}`}
                value={image.caption}
                onInput={setImageCaption(index)}
              >
              </input>
              <img src={image.url} style="max-width: 100%; height: auto;" />
              <button onClick={() => removeImage(index)}>Remove</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default IndexPage;
