import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { TypeBadge } from "./Badges";
import { colors, initials } from "../lib/helpers";
import { ExpandableText } from "./ExpandableText";
import { Business } from "../lib/types";

export default function BusinessCard({ 
  biz, 
  onOpen 
}: { 
  biz: Business; 
  onOpen: (biz: Business) => void;
}) {
  return (
    <Card 
      className="border rounded-2xl cursor-pointer hover:shadow-lg transition-shadow" 
      onClick={() => onOpen(biz)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border" style={{ borderColor: colors.gold }}>
            {biz.avatar ? (
              <img src={biz.avatar} alt="avatar" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <AvatarFallback style={{ background: colors.black, color: colors.gold }}>
                {initials(biz.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <div className="flex items-start gap-2">
              <ExpandableText text={biz.name} className="text-lg font-semibold flex-1" lines={3} />
              <TypeBadge type="business" />
            </div>
            <div className="text-sm opacity-70">{biz.category}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
  <ExpandableText text={biz.bio || "No bio yet."} className="text-sm" lines={3} />
        {biz.website && (
          <a
            href={biz.website}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline mt-2 inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            {biz.website}
          </a>
        )}
      </CardContent>
    </Card>
  );
}
