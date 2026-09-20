const urls = process.argv.slice(2);

if (!urls.length) {
  console.error(
    "Uso: node scripts/legal/node-fetch-test.mjs https://example.com"
  );

  process.exit(2);
}

for (const url of urls) {
  console.log("\n================================================");
  console.log(url);
  console.log("================================================");

  const started = Date.now();

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; JurisFlow/1.4; LegalResearch)"
      },

      signal: AbortSignal.timeout(30000)
    });

    const body = await response.text();

    console.log("HTTP:", response.status);
    console.log("URL:", response.url);
    console.log("TYPE:", response.headers.get("content-type"));
    console.log("BYTES:", Buffer.byteLength(body));
    console.log("TIME:", Date.now() - started, "ms");

    if (!response.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("ERROR:", error);
    console.error("CAUSE:", error?.cause);

    process.exitCode = 1;
  }
}
