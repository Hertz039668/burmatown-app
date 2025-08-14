import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { BUSINESS_CATEGORIES } from "../lib/categories";
import { colors, initials, readFileAsDataUrl } from "../lib/helpers";
import { ExpandableText } from "./ExpandableText";

export default function BusinessProfileForm({
  profile,
  setProfile,
}: {
  profile: { type: "business" | "student" | "general"; name: string; category?: string; website?: string; bio?: string; avatar?: string };
  setProfile: (p: any) => void;
}) {
  const [type, setType] = useState(profile?.type || "general");
  const [name, setName] = useState(profile?.name || "");
  const [category, setCategory] = useState(profile?.category || "");
  const [customCategory, setCustomCategory] = useState("");
  const [bio, setBio] = useState(profile?.bio || "");
  const [website, setWebsite] = useState(profile?.website || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const onSave = async () => {
    let avatar = profile?.avatar || "";
    if (avatarFile) {
      try { avatar = await readFileAsDataUrl(avatarFile); } catch {}
    }
    const finalCategory = category === "Other" ? (customCategory || "Other") : category;
    setProfile({ type, name: name || (type === "business" ? "New Business" : "New User"), category: finalCategory, website, bio, avatar });
  };

  return (
    <Card className="border rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Account & Business Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border" style={{ borderColor: colors.gold }}>
            {profile?.avatar ? (
              <img src={profile.avatar} alt="avatar" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <AvatarFallback style={{ background: colors.black, color: colors.gold }}>{initials(profile?.name)}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <label className="text-xs opacity-70">Upload profile picture</label>
            <Input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs opacity-70">Account Type</label>
            <Select value={type} onValueChange={(value) => setType(value as "business" | "student" | "general")}>
              <SelectTrigger>
                <SelectValue placeholder="Choose type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">Business Owner</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="general">General User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs opacity-70">Display Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name or brand" />
          </div>
          {type === "business" && (
            <>
              <div>
                <label className="text-xs opacity-70">Business Category</label>
                <Select value={category || ""} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {category === "Other" && (
                <div>
                  <label className="text-xs opacity-70">Custom Category</label>
                  <Input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Type your category" />
                </div>
              )}
              <div className="col-span-2">
                <label className="text-xs opacity-70">Website</label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourstore.com" />
              </div>
            </>
          )}
        </div>
        <div>
          <label className="text-xs opacity-70">Bio / Description</label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the community about you" />
          {bio && (
            <div className="mt-2 border rounded-md p-2 bg-muted/30">
              <ExpandableText text={bio} lines={3} className="text-sm" />
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={onSave} style={{ background: colors.black, color: colors.gold }}>
            Save Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
