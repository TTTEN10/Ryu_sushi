import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ToastAction } from "@/components/ui/toast"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar"
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { ChevronDown, Home, Settings, Users, Bell, Search, Plus, MoreHorizontal, Calendar as CalendarIcon, TrendingUp } from "lucide-react"

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [date, setDate] = useState(new Date())
  const [sliderValue, setSliderValue] = useState([50])
  const [checked, setChecked] = useState(false)
  const { toast } = useToast()

  const chartConfig = {
    desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
    mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
  }

  return (
    <TooltipProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <Sidebar>
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg">
                  <span className="font-semibold">Tenenbaum Dev</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Home className="h-4 w-4" />
                      <span>Home</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Users className="h-4 w-4" />
                      <span>Users</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-4 border-b px-4">
            <SidebarTrigger />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-6">
              {/* Hero Section */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Dashboard</h1>
                  <p className="text-muted-foreground">Welcome to your component showcase</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Item
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$45,231.89</div>
                    <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+2350</div>
                    <p className="text-xs text-muted-foreground">+180.1% from last month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Sales</CardTitle>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+12,234</div>
                    <p className="text-xs text-muted-foreground">+19% from last month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Active Now</CardTitle>
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+573</div>
                    <p className="text-xs text-muted-foreground">+201 since last hour</p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                  <CardDescription>Monthly performance data</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="desktop" stroke="var(--color-desktop)" fill="var(--color-desktop)" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="mobile" stroke="var(--color-mobile)" fill="var(--color-mobile)" fillOpacity={0.3} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Two Column Layout */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Form Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Form Elements</CardTitle>
                    <CardDescription>Interactive form components</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="Enter your email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea id="message" placeholder="Enter your message" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="terms" checked={checked} onCheckedChange={setChecked} />
                      <Label htmlFor="terms">Accept terms and conditions</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Notifications</Label>
                      <Select defaultValue="email">
                        <SelectTrigger>
                          <SelectValue placeholder="Select notification type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="push">Push</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Volume: {sliderValue[0]}%</Label>
                      <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
                    </div>
                  </CardContent>
                </Card>

                {/* Interactive Elements */}
                <Card>
                  <CardHeader>
                    <CardTitle>Interactive Components</CardTitle>
                    <CardDescription>Buttons, toggles, and more</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button>Default</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="destructive">Destructive</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="link">Link</Button>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-4">
                      <ToggleGroup type="single">
                        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
                        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
                        <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-4">
                      <RadioGroup defaultValue="option-one">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="option-one" id="option-one" />
                          <Label htmlFor="option-one">Option One</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="option-two" id="option-two" />
                          <Label htmlFor="option-two">Option Two</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <Separator />
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">
                            Open Menu <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>My Account</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Profile</DropdownMenuItem>
                          <DropdownMenuItem>Billing</DropdownMenuItem>
                          <DropdownMenuItem>Settings</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline">Open Dialog</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Dialog Title</DialogTitle>
                            <DialogDescription>This is a dialog description.</DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button>Confirm</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline">Open Sheet</Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle>Sheet Title</SheetTitle>
                            <SheetDescription>Sheet description here.</SheetDescription>
                          </SheetHeader>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>A table showing recent transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>John Doe</TableCell>
                        <TableCell><Badge>Active</Badge></TableCell>
                        <TableCell>$1,234.00</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Jane Smith</TableCell>
                        <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                        <TableCell>$567.00</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Bob Wilson</TableCell>
                        <TableCell><Badge variant="destructive">Inactive</Badge></TableCell>
                        <TableCell>$890.00</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Alerts and Progress */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Alerts</CardTitle>
                    <CardDescription>Notification components</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertTitle>Heads up!</AlertTitle>
                      <AlertDescription>This is a default alert message.</AlertDescription>
                    </Alert>
                    <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>Something went wrong. Please try again.</AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Progress & Loading</CardTitle>
                    <CardDescription>Progress indicators and skeletons</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Upload progress</span>
                        <span>75%</span>
                      </div>
                      <Progress value={75} />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Card>
                <CardHeader>
                  <CardTitle>Tabs</CardTitle>
                  <CardDescription>Tabbed content interface</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="account" className="w-full">
                    <TabsList>
                      <TabsTrigger value="account">Account</TabsTrigger>
                      <TabsTrigger value="password">Password</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="account" className="space-y-4 pt-4">
                      <p className="text-sm text-muted-foreground">Manage your account settings here.</p>
                    </TabsContent>
                    <TabsContent value="password" className="space-y-4 pt-4">
                      <p className="text-sm text-muted-foreground">Change your password here.</p>
                    </TabsContent>
                    <TabsContent value="settings" className="space-y-4 pt-4">
                      <p className="text-sm text-muted-foreground">Configure your preferences.</p>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Calendar and Collapsible */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Calendar</CardTitle>
                    <CardDescription>Date picker component</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Collapsible</CardTitle>
                    <CardDescription>Expandable content sections</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Collapsible className="space-y-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full">
                          Click to expand
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">This is collapsible content that can be expanded or collapsed.</p>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              </div>

              {/* Pagination */}
              <Card>
                <CardHeader>
                  <CardTitle>Pagination</CardTitle>
                  <CardDescription>Navigation between pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious href="#" />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#">1</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#" isActive>2</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#">3</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext href="#" />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </CardContent>
              </Card>

              {/* Toast Demo */}
              <Card>
                <CardHeader>
                  <CardTitle>Toast Notifications</CardTitle>
                  <CardDescription>Click to trigger toast notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button onClick={() => toast({ title: "Success!", description: "Your action was completed." })}>
                      Show Success Toast
                    </Button>
                    <Button variant="outline" onClick={() => toast({
                      title: "Error",
                      description: "Something went wrong.",
                      variant: "destructive",
                    })}>
                      Show Error Toast
                    </Button>
                    <Button variant="secondary" onClick={() => toast({
                      title: "Action Required",
                      description: "Please review your changes.",
                      action: <ToastAction altText="Undo">Undo</ToastAction>,
                    })}>
                      Show Action Toast
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
  )
}

export default App