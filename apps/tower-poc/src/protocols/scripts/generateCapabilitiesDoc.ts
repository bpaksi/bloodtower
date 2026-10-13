import { writeFileSync } from "node:fs";
import { renderCapabilitiesDoc } from "../capabilitiesDoc.ts";
import { dataVersion, docPath } from "./capabilitiesDocPaths.ts";

writeFileSync(docPath, renderCapabilitiesDoc(dataVersion()));
console.log(`wrote ${docPath}`);
