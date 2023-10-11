import { XMLValidator } from "fast-xml-parser";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from "fs";

const path =
  "/Users/amf/projects/gpt-tutor/gpt-tutor-lib/output/2023-10-11T06:50:35.928Z/Shopping in Japanese.xml";
const xml = readFileSync(path, "utf-8");
console.log("valres", XMLValidator.validate(xml));
