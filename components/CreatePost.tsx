import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Send, LogIn, X } from "lucide-react";
import { colors, readFileAsDataUrl, isImageUrl, isVideoUrl } from "../lib/helpers";
import { useUIState } from "../lib/uiState";

export default function CreatePost({
  profile,
  onCreate,
  sessionUser,
}: {
  profile: { type: "business" | "student" | "general" };
  onCreate: (p: { title: string; body: string; media?: string[]; price?: string }) => void;
  sessionUser?: { email: string } | null;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaList, setMediaList] = useState<string[]>([]);
  const { pushToast, setLoading } = useUIState();
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Price removed for business flow per spec

  if (!sessionUser) {
    return (
      <Card className="border rounded-2xl">
        <CardContent className="py-6 flex items-center justify-between">
          <div className="text-sm">Sign up or sign in to create a Community or Product post.</div>
          <Button style={{ background: colors.gold, color: colors.black }}>
            <LogIn className="h-4 w-4 mr-1" /> Sign up / Sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async () => {
    setTouched(true);
    const isBusiness = profile.type === "business";
    const missing = isBusiness ? !body.trim() : (!title.trim() || !body.trim());
    if (missing) {
      setError(isBusiness ? 'Description is required.' : (!title.trim() ? 'Title is required.' : 'Body is required.'));
      pushToast('Please fill required fields', { type: 'error' });
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let finalMedia = [...mediaList];
      const computedTitle = profile.type === 'business'
        ? (body.trim().split(/\n+/)[0]).slice(0,120) || 'Post'
        : title.trim();
      await Promise.resolve(onCreate({
        title: computedTitle,
        body: body.trim(),
        media: finalMedia.length ? finalMedia : undefined,
      }));
      setTitle("");
      setBody("");
      setMediaList([]);
      setTouched(false);
      pushToast('Post created', { type: 'success' });
    } catch (e:any) {
      pushToast('Failed to create post', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const isBusiness = profile.type === "business";

  return (
    <Card className="border rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">
          {isBusiness ? "Create a post" : "Community Post"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isBusiness && (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={"What's on your mind?"}
          />
        )}
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isBusiness ? "Add a description" : "Share details..."}
        />
        {touched && error && (
          <div className="text-xs text-red-600 font-medium">{error}</div>
        )}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="flex-1 inline-flex items-center justify-between gap-2 border rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-black/5 transition" style={{ borderColor: colors.smoke }}>
              <span className="truncate select-none">{mediaList.length? `Media selected (${mediaList.length}/10)` : 'Add media (images or videos, up to 10)'}</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if(!files.length) return;
                  // Remaining slots
                  const remaining = 10 - mediaList.length;
                  if(remaining <= 0) return;
                  const limited = files.slice(0, remaining);
                  const dataUrls = await Promise.all(limited.map(f => readFileAsDataUrl(f).catch(()=>'')));
                  setMediaList(prev => [...prev, ...dataUrls.filter(Boolean)].slice(0,10));
                  // reset input so selecting same files again triggers change
                  e.target.value = '';
                }}
              />
            </label>
            <Button
              onClick={handleSubmit}
              disabled={isBusiness ? !body.trim() : (!title.trim() || !body.trim())}
              style={{ background: colors.gold, color: colors.black }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {mediaList.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {mediaList.map((m, i) => (
                <div key={i} className="relative group border rounded overflow-hidden">
                  {isVideoUrl(m) ? (
                    <video className="w-full h-24 object-cover" src={m} />
                  ) : (
                    <img className="w-full h-24 object-cover" src={m} />
                  )}
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => setMediaList(list => list.filter((_, idx) => idx !== i))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
