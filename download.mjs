import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import { readdir } from "fs";
import path from "path";

export async function downloadAudio(trackNames) {
  try {
    const data = await fs.readFile("youtubeLinks.txt", "utf8");
    const links = data.split("\n");

    readdir("output", (err, files) => {
      if (err) throw err;
      for (const file of files) {
        fs.unlink(path.join("output", file), (err) => {
          if (err) throw err;
        });
      }
    });

    for (let index = 0; index < links.length; index++) {
      const link = links[index].trim();

      if (link === "") {
        continue;
      }

      const videoURL = link;

      const outputPath = `output/${trackNames[index]}.mp3`;

      console.log(
        `Downloading audio ${index + 1}/${links.length} from ${videoURL}`,
      );

      const info = await ytdl.getInfo(videoURL);
      const audioStream = ytdl(videoURL, {
        quality: "highestaudio",
      });

      ffmpeg()
        .input(audioStream)
        .audioCodec("libmp3lame")
        .toFormat("mp3")
        .save(outputPath)
        .on("end", () => {
          console.log(`Downloaded audio ${trackNames[index]}`);
        })
        .on("error", (err) => {
          console.error(`Error converting ${videoURL} to MP3:`, err);
        });
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
