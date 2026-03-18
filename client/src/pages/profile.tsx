import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, User, Mail, Link as LinkIcon, Briefcase, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setHeadline(user.headline || "");
      setLinkedInUrl(user.linkedInUrl || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

  const initials = (user?.name || user?.username || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile({ name, email, headline, linkedInUrl, avatarUrl });
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account details and public presence</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl || undefined} alt={name || user.username} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{name || user.username}</CardTitle>
            <CardDescription>{headline || "Technical Founder"}</CardDescription>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Joined {format(new Date(user.createdAt), "MMMM yyyy")}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                data-testid="input-profile-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-username" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Username
              </Label>
              <Input
                id="profile-username"
                value={user.username}
                disabled
                className="opacity-60"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              data-testid="input-profile-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline" className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              Headline
            </Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Technical Founder building SaaS in public"
              maxLength={200}
              data-testid="input-profile-headline"
            />
            <p className="text-xs text-muted-foreground">Used in LinkedIn post previews. {200 - headline.length} chars remaining.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin-url" className="flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
              LinkedIn Profile URL
            </Label>
            <Input
              id="linkedin-url"
              type="url"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourhandle"
              data-testid="input-profile-linkedin"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar-url" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Avatar URL
            </Label>
            <Input
              id="avatar-url"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              data-testid="input-profile-avatar"
            />
            <p className="text-xs text-muted-foreground">Link to a profile photo (HTTPS required)</p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={handleSave} disabled={isLoading} data-testid="button-save-profile">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
