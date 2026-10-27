async function testMux() {
  const ids = [
    "BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM",
    "OfjbQ3esQifgboENTs4oDXslCP5sSnst",
    "uNbxnGLKJ00yfbijDO8COxTOyVKT01xpxW",
    "L01T3l4CWmukIZ8Cr1Iq9pG7A8YF2E65z",
    "DS00Spx1CV902MCtPj5WknGlR102V5HFkDe",
    "OiiwNmYmECTBviTLfzMQUsSp9hlZn5cPW3bGFkAaDts"
  ];
  for (const id of ids) {
    for (const q of ["high.mp4", "medium.mp4", "low.mp4", "capped-1080p.mp4"]) {
      const url = `https://stream.mux.com/${id}/${q}`;
      const r = await fetch(url, { method: "HEAD" });
      if (r.ok) {
        console.log("FOUND:", url, "->", r.status, r.headers.get("content-length"));
      }
    }
  }
}
testMux();
