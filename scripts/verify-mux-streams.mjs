async function testAllMux() {
  const playbackIds = [
    "RlOWn2N00KGr2dwVC7xdaVjBVHQ7ptzmY7FRGfJaLdJA",
    "w00mC5b1hZyi82Y6OhtPz8kFMbvQbRrtkMnl021QjHTAM",
    "AdPmibTrZsiabXIxe6J2OcDizH4Ixjy533f01k2N7eBU",
    "LyKK5PkbYpusRKKBGtGGsxUbpXC02NpCu7U013d4jthGA",
    "G02alC1eiUll88eziAjUJ674s8tPf2E26itoL7mfuNks",
    "WPaTIZRTYSrk5cGq02eqz8TOb501JDO5mYC2npX01gUS7Q",
    "00lX4lTKbq3oLHMazeS1KPVloSgV5e402oAgdmVYpkD00g",
    "5fC01MnSDXDwbTCzTTk221z00fxC01hZbDjW9b4U00QmYzk",
    "HEAvoeZQdvyuUMpP1jv3Hh5iVknaY828kpMPMFO2Wu00",
    "BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM",
    "OfjbQ3esQifgboENTs4oDXslCP5sSnst",
    "uNbxnGLKJ00yfbijDO8COxTOyVKT01xpxW",
    "L01T3l4CWmukIZ8Cr1Iq9pG7A8YF2E65z",
    "DS00Spx1CV902MCtPj5WknGlR102V5HFkDe",
    "OiiwNmYmECTBviTLfzMQUsSp9hlZn5cPW3bGFkAaDts",
  ];

  console.log(`Testing ${playbackIds.length} Mux Playback IDs...`);
  let okCount = 0;
  for (const id of playbackIds) {
    const streamUrl = `https://stream.mux.com/${id}.m3u8`;
    const res = await fetch(streamUrl, { method: "HEAD" });
    if (res.ok) {
      okCount++;
      console.log(`✅ [${res.status}] ${id}`);
    } else {
      console.log(`❌ [${res.status}] ${id}`);
    }
  }

  console.log(`\nResult: ${okCount}/${playbackIds.length} Mux streams are 100% active and streaming!`);
}

testAllMux().catch(console.error);
