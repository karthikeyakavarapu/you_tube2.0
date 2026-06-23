import { Bell, Menu, Mic, Search, User, VideoIcon } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";

const Header = () => {
  const {
    user,
    logout,
    handlegooglesignin,
    theme,
    detectedState,
    simulatedState,
    setSimulatedState,
    simulatedTime,
    setSimulatedTime,
  } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeypress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e as any);
    }
  };

  return (
    <div className="w-full border-b dark:border-neutral-800">
      <header className="flex items-center justify-between px-4 py-2 bg-white dark:bg-neutral-900 dark:text-white transition-colors duration-300">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="dark:text-white">
            <Menu className="w-6 h-6" />
          </Button>
          <Link href="/" className="flex items-center gap-1">
            <div className="bg-red-600 p-1 rounded">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <span className="text-xl font-medium">YourTube</span>
            <span className="text-xs text-gray-400 ml-1">IN</span>
          </Link>
        </div>
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 flex-1 max-w-2xl mx-4"
        >
          <div className="flex flex-1">
            <Input
              type="search"
              placeholder="Search"
              value={searchQuery}
              onKeyPress={handleKeypress}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-l-full border-r-0 focus-visible:ring-0 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
            <Button
              type="submit"
              className="rounded-r-full px-6 bg-gray-50 hover:bg-gray-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-600 dark:text-neutral-200 border border-l-0 dark:border-neutral-700"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full dark:text-white">
            <Mic className="w-5 h-5" />
          </Button>
        </form>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="dark:text-white"
            onClick={() => {
              if (!user) {
                toast.error("Please sign in to create a channel and upload videos!");
              } else if (!user.channelname) {
                setisdialogeopen(true);
              } else {
                router.push(`/channel/${user._id}`);
              }
            }}
          >
            <VideoIcon className="w-6 h-6" />
          </Button>

          {user ? (
            <>
              <Button variant="ghost" size="icon" className="dark:text-white">
                <Bell className="w-6 h-6" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image} />
                      <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  {user?.channelname ? (
                    <DropdownMenuItem asChild>
                      <Link href={`/channel/${user?._id}`}>Your channel</Link>
                    </DropdownMenuItem>
                  ) : (
                    <div className="px-2 py-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => setisdialogeopen(true)}
                      >
                        Create Channel
                      </Button>
                    </div>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/history">History</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/liked">Liked videos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/watch-later">Watch later</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                className="flex items-center gap-2"
                onClick={handlegooglesignin}
              >
                <User className="w-4 h-4" />
                Sign in
              </Button>
            </>
          )}{" "}
        </div>
        <Channeldialogue
          isopen={isdialogeopen}
          onclose={() => setisdialogeopen(false)}
          mode="create"
        />
      </header>

      {/* Debug Mock / Simulation Panel */}
      <div className="bg-gray-50 dark:bg-neutral-950 px-4 py-1.5 text-xs border-t dark:border-neutral-800 flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-red-500">⚙️ MOCK REGION & TIME:</span>
          <span>IP Region: <strong>{detectedState || "Chennai (Default)"}</strong></span>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="font-medium">State:</label>
          <select
            value={simulatedState}
            onChange={(e) => setSimulatedState(e.target.value)}
            className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded px-1.5 py-0.5 focus:outline-none dark:text-white"
          >
            <option value="">Auto (Use IP)</option>
            <option value="Tamil Nadu">Tamil Nadu (South India - Light)</option>
            <option value="Kerala">Kerala (South India - Light)</option>
            <option value="Karnataka">Karnataka (South India - Light)</option>
            <option value="Delhi">Delhi (North India - Dark)</option>
            <option value="Maharashtra">Maharashtra (West India - Dark)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-medium">Login Time:</label>
          <select
            value={simulatedTime}
            onChange={(e) => setSimulatedTime(e.target.value)}
            className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded px-1.5 py-0.5 focus:outline-none dark:text-white"
          >
            <option value="">Auto (Use Current)</option>
            <option value="11:00 AM">11:00 AM (10:00 AM - 12:00 PM - Light)</option>
            <option value="09:00 PM">09:00 PM (Other Time - Dark)</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="font-medium">Theme:</span>
          <span className={`px-2 py-0.5 rounded font-bold uppercase ${
            theme === "light" ? "bg-amber-100 text-amber-800" : "bg-neutral-800 text-neutral-300"
          }`}>
            {theme}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Header;
