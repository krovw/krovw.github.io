import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    isPlaying: true,
    track: "VINDO DO BACKEND",
    artist: "TESTE",
    album: "TESTE",
    albumArt: "https://i.scdn.co/image/ab67616d0000b273a036b8b30b4c0f7b4b8a4e7a",
    spotifyUrl: "https://open.spotify.com/",
    lastUpdated: new Date().toISOString(),
  });
}