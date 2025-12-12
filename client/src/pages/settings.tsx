import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Save,
  Loader2,
  Sparkles,
  X,
  Plus
} from "lucide-react";
import type { StyleSettings } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const toneOptions = [
  { value: "professional", label: "Professional", description: "Polished and business-focused" },
  { value: "casual", label: "Casual", description: "Friendly and approachable" },
  { value: "technical", label: "Technical", description: "Detailed and precise" },
  { value: "storytelling", label: "Storytelling", description: "Narrative and engaging" },
];

const styleOptions = [
  { value: "builder", label: "The Builder", description: "Focused on shipping and creating" },
  { value: "contrarian", label: "The Contrarian", description: "Challenges conventional thinking" },
  { value: "data-focused", label: "Data-Focused", description: "Numbers and metrics driven" },
  { value: "humble", label: "The Humble Builder", description: "Authentic and down-to-earth" },
];

function TagInput({ 
  label, 
  description,
  values, 
  onChange,
  placeholder 
}: {
  label: string;
  description: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const addTag = () => {
    if (inputValue.trim() && !values.includes(inputValue.trim())) {
      onChange([...values, inputValue.trim()]);
      setInputValue("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(values.filter(v => v !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          data-testid={`input-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        <Button 
          type="button" 
          variant="outline" 
          onClick={addTag}
          data-testid={`button-add-${label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {values.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button 
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<StyleSettings>({
    queryKey: ["/api/settings/style"],
  });

  const [tone, setTone] = useState("professional");
  const [style, setStyle] = useState("builder");
  const [examples, setExamples] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [avoidWords, setAvoidWords] = useState<string[]>([]);
  const [exampleText, setExampleText] = useState("");

  useEffect(() => {
    if (settings) {
      setTone(settings.tone);
      setStyle(settings.style);
      setExamples(settings.examples || []);
      setKeywords(settings.keywords || []);
      setAvoidWords(settings.avoidWords || []);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: {
      tone: string;
      style: string;
      examples: string[];
      keywords: string[];
      avoidWords: string[];
    }) => {
      return apiRequest("POST", "/api/settings/style", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/style"] });
      toast({
        title: "Settings saved",
        description: "Your style preferences have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      tone,
      style,
      examples,
      keywords,
      avoidWords,
    });
  };

  const addExample = () => {
    if (exampleText.trim() && !examples.includes(exampleText.trim())) {
      setExamples([...examples, exampleText.trim()]);
      setExampleText("");
    }
  };

  const removeExample = (example: string) => {
    setExamples(examples.filter(e => e !== example));
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Customize how your content is generated
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Customize how your content is generated
          </p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saveMutation.isPending}
          data-testid="button-save-settings"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Writing Tone
            </CardTitle>
            <CardDescription>
              Set the overall tone for your generated content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger data-testid="select-tone">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                {toneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                {toneOptions.find(t => t.value === tone)?.description}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Writing Style</CardTitle>
            <CardDescription>
              Choose your personal branding style
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger data-testid="select-style">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                {styleOptions.find(s => s.value === style)?.description}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Example Posts</CardTitle>
            <CardDescription>
              Add examples of posts you like to help the AI match your preferred style
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Textarea
                value={exampleText}
                onChange={(e) => setExampleText(e.target.value)}
                placeholder="Paste an example post you like..."
                rows={3}
                className="resize-none"
                data-testid="textarea-example"
              />
              <Button 
                variant="outline" 
                onClick={addExample}
                className="shrink-0"
                data-testid="button-add-example"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {examples.length > 0 && (
              <div className="space-y-3">
                {examples.map((example, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-lg border bg-card relative group"
                  >
                    <button
                      onClick={() => removeExample(example)}
                      className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="text-sm line-clamp-3 pr-8">{example}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferred Keywords</CardTitle>
            <CardDescription>
              Words and phrases to emphasize in your content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TagInput
              label="Keywords"
              description="Add words you want to use frequently"
              values={keywords}
              onChange={setKeywords}
              placeholder="e.g., bootstrapped, indie hacker"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Words to Avoid</CardTitle>
            <CardDescription>
              Words and phrases to exclude from generated content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TagInput
              label="Avoid Words"
              description="Add words you never want to use"
              values={avoidWords}
              onChange={setAvoidWords}
              placeholder="e.g., synergy, disruption"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
