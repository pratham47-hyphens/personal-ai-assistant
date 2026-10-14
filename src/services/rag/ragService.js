import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import fs from 'fs';
import path from 'path';

class RagService {
  constructor() {
    this.embeddings = new OllamaEmbeddings({
      model: "llama3", // Use llama3 or your preferred embedding-capable model
      baseUrl: "http://localhost:11434",
    });
    this.vectorStore = null;
    this.indexDir = path.join(process.cwd(), 'ai_index');
  }

  async indexFolder(folderPath) {
    console.log(`Indexing folder: ${folderPath}`);
    const files = this._getFilesRecursively(folderPath);
    let allDocs = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });
        const docs = await splitter.createDocuments([content], [file]);
        allDocs.push(...docs);
      } catch (e) {
        console.error(`Could not read file ${file}:`, e);
      }
    }

    this.vectorStore = await HNSWLib.fromDocuments(allDocs, this.embeddings);
    await this.vectorStore.save(this.indexDir);
    console.log(`Indexed ${allDocs.length} chunks to ${this.indexDir}`);
    return allDocs.length;
  }

  async query(queryText) {
    if (!this.vectorStore) {
      // Try to load existing index
      if (fs.existsSync(this.indexDir)) {
        this.vectorStore = await HNSWLib.load(this.indexDir, this.embeddings);
      } else {
        throw new Error("No index found. Please index a folder first.");
      }
    }

    const results = await this.vectorStore.similaritySearch(queryText, 4);
    return results.map(doc => doc.pageContent).join('\n\n---\n\n');
  }

  _getFilesRecursively(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.resolve(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(this._getFilesRecursively(file));
      } else if (file.endsWith('.txt') || file.endsWith('.js') || file.endsWith('.md') || file.endsWith('.json')) {
        results.push(file);
      }
    });
    return results;
  }
}

export default new RagService();
