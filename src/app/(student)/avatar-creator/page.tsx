
"use client";

import { useState, useContext } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createAvatar, type CreateAvatarInput } from "@/ai/flows/create-avatar";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { StudentDataContext } from "@/context/StudentDataContext";
import { uploadImageFromString } from "@/hooks/use-firebase-storage";

// --- 造型選項資料 ---

const styles = {
  hair: [
    { name: "金色長髮", thumbnail: "https://i.imgur.com/L4Z1j5s.png", prompt: "long golden hair" },
    { name: "黑色短髮", thumbnail: "https://i.imgur.com/yv4s5Y8.png", prompt: "short black hair" },
    { name: "棕色辮子", thumbnail: "https://i.imgur.com/O6XjYjA.png", prompt: "brown pigtails" },
    { name: "粉紅包包頭", thumbnail: "https://i.imgur.com/S5Xf4mJ.png", prompt: "pink buns hair" },
  ],
  eyes: [
    { name: "藍色大眼", thumbnail: "https://i.imgur.com/o2xZkL9.png", prompt: "big blue eyes" },
    { name: "綠色眼睛", thumbnail: "https://i.imgur.com/W2A8Rra.png", prompt: "sparkling green eyes" },
    { name: "瞇瞇笑眼", thumbnail: "https://i.imgur.com/sC5q08P.png", prompt: "smiling eyes" },
    { name: "驚訝圓眼", thumbnail: "https://i.imgur.com/3Z6sZ0h.png", prompt: "surprised round eyes" },
  ],
  mouth: [
    { name: "開心微笑", thumbnail: "https://i.imgur.com/3rGq36b.png", prompt: "happy smile" },
    { name: "O型小嘴", thumbnail: "https://i.imgur.com/8a3a2bJ.png", prompt: "small O-shaped mouth" },
    { name: "吐舌頭", thumbnail: "https://i.imgur.com/5l0hF3h.png", prompt: "tongue out" },
    { name: "得意笑容", thumbnail: "https://i.imgur.com/qJQH7mO.png", prompt: "smirking smile" },
  ],
  accessory: [
     { name: "無", thumbnail: "https://i.imgur.com/v8tFk6k.png", prompt: "no accessory" },
     { name: "飛行員護目鏡", thumbnail: "https://i.imgur.com/o1g9j3L.png", prompt: "wearing aviator goggles on forehead" },
     { name: "貓耳耳機", thumbnail: "https://i.imgur.com/T0v6b7N.png", prompt: "wearing cat ear headphones" },
     { name: "蝴蝶髮夾", thumbnail: "https://i.imgur.com/x5z4A8d.png", prompt: "wearing a butterfly hair clip" },
  ]
};

type StyleCategory = keyof typeof styles;

// --- 組件 ---

export default function AvatarCreatorPage() {
  const { studentData } = useContext(StudentDataContext);
  const { setStudents } = useContext(AppDataContext);
  const { toast } = useToast();

  const [selections, setSelections] = useState({
    hair: styles.hair[0],
    eyes: styles.eyes[0],
    mouth: styles.mouth[0],
    accessory: styles.accessory[0],
  });
  
  const [generatedAvatar, setGeneratedAvatar] = useState<string>(studentData.student?.avatar || "https://i.imgur.com/pAn39b4.png");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSelect = (category: StyleCategory, item: typeof styles[StyleCategory][0]) => {
    setSelections(prev => ({ ...prev, [category]: item }));
  };

  const handleGenerate = async () => {
    if (!studentData.student) {
        toast({ title: "錯誤", description: "無法讀取學生資料，請重新登入。", variant: "destructive" });
        return;
    }
    setIsGenerating(true);
    
    const input: CreateAvatarInput = {
        hair: selections.hair.prompt,
        eyes: selections.eyes.prompt,
        mouth: selections.mouth.prompt,
        accessory: selections.accessory.prompt,
    };

    try {
        const result = await createAvatar(input);
        
        if (result.imageUrl) {
            setGeneratedAvatar(result.imageUrl);
            
            // Upload the image to Firebase Storage and get URL
            const filePath = `avatars/${studentData.student.classId}-${studentData.student.id}-${Date.now()}.png`;
            const downloadURL = await uploadImageFromString(result.imageUrl, filePath);

            if (!downloadURL) {
                throw new Error("圖片上傳至雲端儲存失敗。");
            }
            
            // Update student data in context and Firestore with the new URL
            await setStudents(currentStudents => currentStudents.map(s => {
                if (s.id === studentData.student?.id && s.classId === studentData.student.classId) {
                    return { ...s, avatar: downloadURL };
                }
                return s;
            }));

            toast({ title: "分身已更新！", description: "你的新造型已經儲存好了。" });
        } else {
             throw new Error("AI 未能回傳圖片。");
        }
    } catch (error: any) {
        console.error("Avatar generation or upload failed:", error);
        toast({
            title: "生成失敗",
            description: error.message || "生成分身時發生錯誤，請稍後再試一次。",
            variant: "destructive",
        });
    } finally {
        setIsGenerating(false);
    }
  };

  const OptionCard = ({ item, category }: { item: typeof styles[StyleCategory][0]; category: StyleCategory; }) => {
    const isSelected = selections[category].name === item.name;
    return (
      <Card
        className={cn(
          "cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
          isSelected ? "border-primary ring-2 ring-primary shadow-lg" : "hover:shadow-md"
        )}
        onClick={() => handleSelect(category, item)}
      >
        <CardContent className="p-2">
          <div className="aspect-square relative bg-muted rounded-md">
            <Image src={item.thumbnail} alt={item.name} fill className="object-contain p-2" sizes="150px" />
          </div>
          <p className="text-center text-sm mt-2 truncate">{item.name}</p>
        </CardContent>
      </Card>
    );
  };


  return (
    <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in-0 duration-500">
      
      {/* 左側預覽與生成區塊 */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>我的分身</CardTitle>
            <CardDescription>搭配你最喜歡的造型，讓 AI 為你創造獨一無二的大頭娃娃！</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="w-64 h-64 relative bg-muted rounded-full overflow-hidden border-4 border-primary/20">
              {isGenerating ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              ) : (
                <Image src={generatedAvatar} alt="Generated Avatar" fill className="object-cover" sizes="256px" />
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" size="lg" onClick={handleGenerate} disabled={isGenerating}>
              <Wand2 className="mr-2"/>
              {isGenerating ? "生成中..." : "生成我的分身！"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 右側選項區塊 */}
      <div className="lg:col-span-2">
        <Tabs defaultValue="hair" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hair">髮型</TabsTrigger>
            <TabsTrigger value="eyes">眼睛</TabsTrigger>
            <TabsTrigger value="mouth">嘴巴</TabsTrigger>
            <TabsTrigger value="accessory">配件</TabsTrigger>
          </TabsList>
          
          <TabsContent value="hair" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {styles.hair.map(item => <OptionCard key={item.name} item={item} category="hair" />)}
            </div>
          </TabsContent>

          <TabsContent value="eyes" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {styles.eyes.map(item => <OptionCard key={item.name} item={item} category="eyes" />)}
            </div>
          </TabsContent>

          <TabsContent value="mouth" className="mt-4">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {styles.mouth.map(item => <OptionCard key={item.name} item={item} category="mouth" />)}
            </div>
          </TabsContent>

           <TabsContent value="accessory" className="mt-4">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {styles.accessory.map(item => <OptionCard key={item.name} item={item} category="accessory" />)}
            </div>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
