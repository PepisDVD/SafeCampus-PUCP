/**
 * @safecampus/ui-kit — Barrel export
 * Shared shadcn-compatible UI components for SafeCampus PUCP.
 */

// Lib
export { cn } from "./lib/utils";

// Hooks
export { useIsMobile } from "./hooks/use-mobile";

// Nav — shared sidebar + user nav
export { AppSidebar, type NavItem } from "./components/nav/app-sidebar";
export { UserNav, type UserNavUser } from "./components/nav/user-nav";
export {
  RoleBadge,
  formatRoleLabel,
  getRoleTone,
  type RoleBadgeProps,
} from "./components/role-badge";
export {
  ChannelBadge,
  formatChannelLabel,
  getChannelTone,
  type ChannelBadgeProps,
} from "./components/channel-badge";

// Sidebar primitives
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "./components/ui/sidebar";

// Components
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./components/ui/accordion";
export { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./components/ui/alert-dialog";
export { AspectRatio } from "./components/ui/aspect-ratio";
export { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";
export { Badge, badgeVariants } from "./components/ui/badge";
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "./components/ui/breadcrumb";
export { Button, buttonVariants } from "./components/ui/button";
export { Calendar } from "./components/ui/calendar";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "./components/ui/card";
export { Checkbox } from "./components/ui/checkbox";
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./components/ui/collapsible";
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "./components/ui/command";
export {
  Dialog,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "./components/ui/drawer";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from "./components/ui/dropdown-menu";
export { Input } from "./components/ui/input";
export { SearchInput, type SearchInputProps } from "./components/ui/search-input";
export {
  MultiSelectFilter,
  type MultiSelectFilterProps,
  type MultiSelectOption,
} from "./components/ui/multi-select-filter";
export { FilterBar } from "./components/ui/filter-bar";
export { Label } from "./components/ui/label";
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from "./components/ui/popover";
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./components/ui/pagination";
export { TablePaginationBar } from "./components/ui/table-pagination-bar";
export { Progress } from "./components/ui/progress";
export { ScrollArea, ScrollBar } from "./components/ui/scroll-area";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./components/ui/select";
export { Separator } from "./components/ui/separator";
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./components/ui/sheet";
export { Skeleton } from "./components/ui/skeleton";
export { Slider } from "./components/ui/slider";
export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "./components/ui/carousel";
export { Spinner } from "./components/ui/spinner";
export {
  StatusBadge,
  type StatusBadgeProps,
  type StatusTone,
} from "./components/ui/status-badge";
export { Switch } from "./components/ui/switch";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./components/ui/table";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
export { Textarea } from "./components/ui/textarea";
export { Toggle, toggleVariants } from "./components/ui/toggle";
export { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./components/ui/tooltip";
export { Toaster } from "./components/ui/sonner";
// Se re-exporta `toast` desde aquí para garantizar que las apps usen la MISMA
// instancia de sonner que el <Toaster>; importarlo por separado desde "sonner"
// puede resolver a otra copia del paquete y los toasts no se renderizarían.
export { toast } from "sonner";
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  type ChartConfig,
} from "./components/ui/chart";
