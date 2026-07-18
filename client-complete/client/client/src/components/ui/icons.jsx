/**
 * Tone-aware re-export of every lucide icon used in this app.
 *
 * GENERATED — do not hand-edit. Regenerate after adding a new lucide icon:
 *   python scripts/gen-icons.py
 *
 * Import icons from here, never from 'lucide-react' directly, so that an icon
 * picks up its semantic tone (see @/utils/iconTones) on every surface.
 *
 * The tone is only a class tag; its colour is a zero-specificity :where() rule in
 * index.css. So <Trash2 className="text-white" /> stays white, and any
 * `cx-icon-inherit` surface (primary buttons) reverts its icons to currentColor.
 * Nothing here needs to know about those overrides — the cascade settles it.
 *
 * Icons are wrapped, not re-styled, so `import { X } from '@/components/ui/icons'`
 * keeps lucide's API: same props, same ref forwarding. Untoned icons (chrome,
 * editor toolbars) are re-exported as-is, with no wrapper at all.
 */
import { forwardRef } from 'react'
import {
  Activity as _Activity,
  AlertCircle as _AlertCircle,
  AlertTriangle as _AlertTriangle,
  AlignCenter as _AlignCenter,
  AlignLeft as _AlignLeft,
  AlignRight as _AlignRight,
  Archive as _Archive,
  ArchiveRestore as _ArchiveRestore,
  ArrowDown as _ArrowDown,
  ArrowDownUp as _ArrowDownUp,
  ArrowDownWideNarrow as _ArrowDownWideNarrow,
  ArrowLeft as _ArrowLeft,
  ArrowLeftRight as _ArrowLeftRight,
  ArrowRight as _ArrowRight,
  ArrowUp as _ArrowUp,
  ArrowUpDown as _ArrowUpDown,
  ArrowUpNarrowWide as _ArrowUpNarrowWide,
  ArrowUpRight as _ArrowUpRight,
  AtSign as _AtSign,
  Award as _Award,
  BadgeCheck as _BadgeCheck,
  BadgeDollarSign as _BadgeDollarSign,
  BadgeIndianRupee as _BadgeIndianRupee,
  Banknote as _Banknote,
  BarChart2 as _BarChart2,
  BarChart3 as _BarChart3,
  Bell as _Bell,
  BellRing as _BellRing,
  Bitcoin as _Bitcoin,
  Bold as _Bold,
  BookOpen as _BookOpen,
  Bookmark as _Bookmark,
  BookmarkCheck as _BookmarkCheck,
  Briefcase as _Briefcase,
  BriefcaseBusiness as _BriefcaseBusiness,
  Building as _Building,
  Building2 as _Building2,
  Calendar as _Calendar,
  CalendarCheck as _CalendarCheck,
  CalendarCheck2 as _CalendarCheck2,
  CalendarClock as _CalendarClock,
  CalendarDays as _CalendarDays,
  CalendarPlus as _CalendarPlus,
  Camera as _Camera,
  Check as _Check,
  CheckCircle as _CheckCircle,
  CheckCircle2 as _CheckCircle2,
  CheckSquare as _CheckSquare,
  CheckSquare2 as _CheckSquare2,
  ChevronDown as _ChevronDown,
  ChevronLeft as _ChevronLeft,
  ChevronRight as _ChevronRight,
  ChevronUp as _ChevronUp,
  ChevronsLeft as _ChevronsLeft,
  ChevronsRight as _ChevronsRight,
  Circle as _Circle,
  CircleDollarSign as _CircleDollarSign,
  ClipboardCheck as _ClipboardCheck,
  ClipboardList as _ClipboardList,
  Clock as _Clock,
  Clock3 as _Clock3,
  Compass as _Compass,
  Copy as _Copy,
  CornerUpLeft as _CornerUpLeft,
  Cpu as _Cpu,
  CreditCard as _CreditCard,
  Database as _Database,
  DollarSign as _DollarSign,
  Download as _Download,
  Ellipsis as _Ellipsis,
  ExternalLink as _ExternalLink,
  Eye as _Eye,
  EyeOff as _EyeOff,
  File as _File,
  FileArchive as _FileArchive,
  FileImage as _FileImage,
  FileInput as _FileInput,
  FileSpreadsheet as _FileSpreadsheet,
  FileStack as _FileStack,
  FileText as _FileText,
  Filter as _Filter,
  Flag as _Flag,
  Folder as _Folder,
  FolderInput as _FolderInput,
  FolderOpen as _FolderOpen,
  FolderPlus as _FolderPlus,
  FormInput as _FormInput,
  Forward as _Forward,
  Gauge as _Gauge,
  GitBranch as _GitBranch,
  GitMerge as _GitMerge,
  Globe as _Globe,
  Globe2 as _Globe2,
  GraduationCap as _GraduationCap,
  Grid3X3 as _Grid3X3,
  GripVertical as _GripVertical,
  Hammer as _Hammer,
  HardDrive as _HardDrive,
  Hash as _Hash,
  Heading as _Heading,
  Heart as _Heart,
  HeartHandshake as _HeartHandshake,
  HelpCircle as _HelpCircle,
  History as _History,
  Home as _Home,
  Hourglass as _Hourglass,
  IdCard as _IdCard,
  Image as _Image,
  ImagePlus as _ImagePlus,
  Inbox as _Inbox,
  Info as _Info,
  Italic as _Italic,
  Kanban as _Kanban,
  KeyRound as _KeyRound,
  Landmark as _Landmark,
  Layers as _Layers,
  LayoutGrid as _LayoutGrid,
  LayoutList as _LayoutList,
  LayoutTemplate as _LayoutTemplate,
  LineChart as _LineChart,
  Link2 as _Link2,
  List as _List,
  ListChecks as _ListChecks,
  ListOrdered as _ListOrdered,
  ListTodo as _ListTodo,
  ListTree as _ListTree,
  Loader2 as _Loader2,
  Lock as _Lock,
  LogOut as _LogOut,
  Mail as _Mail,
  MailCheck as _MailCheck,
  MailOpen as _MailOpen,
  Map as _Map,
  MapPin as _MapPin,
  Maximize2 as _Maximize2,
  Megaphone as _Megaphone,
  Menu as _Menu,
  MessageCircle as _MessageCircle,
  MessageSquare as _MessageSquare,
  MessageSquarePlus as _MessageSquarePlus,
  Mic as _Mic,
  Minus as _Minus,
  MoreHorizontal as _MoreHorizontal,
  MousePointerClick as _MousePointerClick,
  Music as _Music,
  NotebookPen as _NotebookPen,
  Palmtree as _Palmtree,
  PanelLeftClose as _PanelLeftClose,
  PanelLeftOpen as _PanelLeftOpen,
  PanelRight as _PanelRight,
  Paperclip as _Paperclip,
  PartyPopper as _PartyPopper,
  Pause as _Pause,
  PenLine as _PenLine,
  Pencil as _Pencil,
  PencilLine as _PencilLine,
  Percent as _Percent,
  Phone as _Phone,
  PhoneCall as _PhoneCall,
  PhoneIncoming as _PhoneIncoming,
  PhoneMissed as _PhoneMissed,
  PhoneOutgoing as _PhoneOutgoing,
  Play as _Play,
  PlayCircle as _PlayCircle,
  Plus as _Plus,
  Presentation as _Presentation,
  Printer as _Printer,
  Puzzle as _Puzzle,
  Quote as _Quote,
  Receipt as _Receipt,
  ReceiptText as _ReceiptText,
  Redo2 as _Redo2,
  RefreshCcw as _RefreshCcw,
  RefreshCw as _RefreshCw,
  RemoveFormatting as _RemoveFormatting,
  Repeat as _Repeat,
  Reply as _Reply,
  ReplyAll as _ReplyAll,
  Rocket as _Rocket,
  RotateCcw as _RotateCcw,
  Route as _Route,
  Save as _Save,
  Scale as _Scale,
  ScanLine as _ScanLine,
  ScrollText as _ScrollText,
  Search as _Search,
  Send as _Send,
  Settings as _Settings,
  Settings2 as _Settings2,
  Shield as _Shield,
  ShieldCheck as _ShieldCheck,
  ShoppingBag as _ShoppingBag,
  ShoppingCart as _ShoppingCart,
  Shuffle as _Shuffle,
  Signal as _Signal,
  SlidersHorizontal as _SlidersHorizontal,
  Smartphone as _Smartphone,
  Sparkles as _Sparkles,
  SquareKanban as _SquareKanban,
  Star as _Star,
  StickyNote as _StickyNote,
  Tag as _Tag,
  Target as _Target,
  ThumbsDown as _ThumbsDown,
  Timer as _Timer,
  Trash2 as _Trash2,
  TrendingDown as _TrendingDown,
  TrendingUp as _TrendingUp,
  Trophy as _Trophy,
  Truck as _Truck,
  Type as _Type,
  Umbrella as _Umbrella,
  Underline as _Underline,
  Undo2 as _Undo2,
  Unlink2 as _Unlink2,
  Upload as _Upload,
  User as _User,
  UserCheck as _UserCheck,
  UserCircle as _UserCircle,
  UserCircle2 as _UserCircle2,
  UserCog as _UserCog,
  UserMinus as _UserMinus,
  UserPlus as _UserPlus,
  UserRound as _UserRound,
  UserRoundCheck as _UserRoundCheck,
  UserX as _UserX,
  Users as _Users,
  UsersRound as _UsersRound,
  Video as _Video,
  Wallet as _Wallet,
  Waypoints as _Waypoints,
  Wifi as _Wifi,
  Workflow as _Workflow,
  X as _X,
  XCircle as _XCircle,
  Zap as _Zap,
  ZoomIn as _ZoomIn,
  ZoomOut as _ZoomOut,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { toneClassFor } from '@/utils/iconTones'

function withTone(Base, name) {
  const tone = toneClassFor(name)
  if (!tone) return Base
  const Toned = forwardRef(function Toned({ className, ...props }, ref) {
    return <Base ref={ref} className={cn(tone, className)} {...props} />
  })
  Toned.displayName = name
  return Toned
}

export const Activity = /*#__PURE__*/ withTone(_Activity, 'Activity')
export const AlertCircle = /*#__PURE__*/ withTone(_AlertCircle, 'AlertCircle')
export const AlertTriangle = /*#__PURE__*/ withTone(_AlertTriangle, 'AlertTriangle')
export const AlignCenter = /*#__PURE__*/ withTone(_AlignCenter, 'AlignCenter')
export const AlignLeft = /*#__PURE__*/ withTone(_AlignLeft, 'AlignLeft')
export const AlignRight = /*#__PURE__*/ withTone(_AlignRight, 'AlignRight')
export const Archive = /*#__PURE__*/ withTone(_Archive, 'Archive')
export const ArchiveRestore = /*#__PURE__*/ withTone(_ArchiveRestore, 'ArchiveRestore')
export const ArrowDown = /*#__PURE__*/ withTone(_ArrowDown, 'ArrowDown')
export const ArrowDownUp = /*#__PURE__*/ withTone(_ArrowDownUp, 'ArrowDownUp')
export const ArrowDownWideNarrow = /*#__PURE__*/ withTone(_ArrowDownWideNarrow, 'ArrowDownWideNarrow')
export const ArrowLeft = /*#__PURE__*/ withTone(_ArrowLeft, 'ArrowLeft')
export const ArrowLeftRight = /*#__PURE__*/ withTone(_ArrowLeftRight, 'ArrowLeftRight')
export const ArrowRight = /*#__PURE__*/ withTone(_ArrowRight, 'ArrowRight')
export const ArrowUp = /*#__PURE__*/ withTone(_ArrowUp, 'ArrowUp')
export const ArrowUpDown = /*#__PURE__*/ withTone(_ArrowUpDown, 'ArrowUpDown')
export const ArrowUpNarrowWide = /*#__PURE__*/ withTone(_ArrowUpNarrowWide, 'ArrowUpNarrowWide')
export const ArrowUpRight = /*#__PURE__*/ withTone(_ArrowUpRight, 'ArrowUpRight')
export const AtSign = /*#__PURE__*/ withTone(_AtSign, 'AtSign')
export const Award = /*#__PURE__*/ withTone(_Award, 'Award')
export const BadgeCheck = /*#__PURE__*/ withTone(_BadgeCheck, 'BadgeCheck')
export const BadgeDollarSign = /*#__PURE__*/ withTone(_BadgeDollarSign, 'BadgeDollarSign')
export const BadgeIndianRupee = /*#__PURE__*/ withTone(_BadgeIndianRupee, 'BadgeIndianRupee')
export const Banknote = /*#__PURE__*/ withTone(_Banknote, 'Banknote')
export const BarChart2 = /*#__PURE__*/ withTone(_BarChart2, 'BarChart2')
export const BarChart3 = /*#__PURE__*/ withTone(_BarChart3, 'BarChart3')
export const Bell = /*#__PURE__*/ withTone(_Bell, 'Bell')
export const BellRing = /*#__PURE__*/ withTone(_BellRing, 'BellRing')
export const Bitcoin = /*#__PURE__*/ withTone(_Bitcoin, 'Bitcoin')
export const Bold = /*#__PURE__*/ withTone(_Bold, 'Bold')
export const BookOpen = /*#__PURE__*/ withTone(_BookOpen, 'BookOpen')
export const Bookmark = /*#__PURE__*/ withTone(_Bookmark, 'Bookmark')
export const BookmarkCheck = /*#__PURE__*/ withTone(_BookmarkCheck, 'BookmarkCheck')
export const Briefcase = /*#__PURE__*/ withTone(_Briefcase, 'Briefcase')
export const BriefcaseBusiness = /*#__PURE__*/ withTone(_BriefcaseBusiness, 'BriefcaseBusiness')
export const Building = /*#__PURE__*/ withTone(_Building, 'Building')
export const Building2 = /*#__PURE__*/ withTone(_Building2, 'Building2')
export const Calendar = /*#__PURE__*/ withTone(_Calendar, 'Calendar')
export const CalendarCheck = /*#__PURE__*/ withTone(_CalendarCheck, 'CalendarCheck')
export const CalendarCheck2 = /*#__PURE__*/ withTone(_CalendarCheck2, 'CalendarCheck2')
export const CalendarClock = /*#__PURE__*/ withTone(_CalendarClock, 'CalendarClock')
export const CalendarDays = /*#__PURE__*/ withTone(_CalendarDays, 'CalendarDays')
export const CalendarPlus = /*#__PURE__*/ withTone(_CalendarPlus, 'CalendarPlus')
export const Camera = /*#__PURE__*/ withTone(_Camera, 'Camera')
export const Check = /*#__PURE__*/ withTone(_Check, 'Check')
export const CheckCircle = /*#__PURE__*/ withTone(_CheckCircle, 'CheckCircle')
export const CheckCircle2 = /*#__PURE__*/ withTone(_CheckCircle2, 'CheckCircle2')
export const CheckSquare = /*#__PURE__*/ withTone(_CheckSquare, 'CheckSquare')
export const CheckSquare2 = /*#__PURE__*/ withTone(_CheckSquare2, 'CheckSquare2')
export const ChevronDown = /*#__PURE__*/ withTone(_ChevronDown, 'ChevronDown')
export const ChevronLeft = /*#__PURE__*/ withTone(_ChevronLeft, 'ChevronLeft')
export const ChevronRight = /*#__PURE__*/ withTone(_ChevronRight, 'ChevronRight')
export const ChevronUp = /*#__PURE__*/ withTone(_ChevronUp, 'ChevronUp')
export const ChevronsLeft = /*#__PURE__*/ withTone(_ChevronsLeft, 'ChevronsLeft')
export const ChevronsRight = /*#__PURE__*/ withTone(_ChevronsRight, 'ChevronsRight')
export const Circle = /*#__PURE__*/ withTone(_Circle, 'Circle')
export const CircleDollarSign = /*#__PURE__*/ withTone(_CircleDollarSign, 'CircleDollarSign')
export const ClipboardCheck = /*#__PURE__*/ withTone(_ClipboardCheck, 'ClipboardCheck')
export const ClipboardList = /*#__PURE__*/ withTone(_ClipboardList, 'ClipboardList')
export const Clock = /*#__PURE__*/ withTone(_Clock, 'Clock')
export const Clock3 = /*#__PURE__*/ withTone(_Clock3, 'Clock3')
export const Compass = /*#__PURE__*/ withTone(_Compass, 'Compass')
export const Copy = /*#__PURE__*/ withTone(_Copy, 'Copy')
export const CornerUpLeft = /*#__PURE__*/ withTone(_CornerUpLeft, 'CornerUpLeft')
export const Cpu = /*#__PURE__*/ withTone(_Cpu, 'Cpu')
export const CreditCard = /*#__PURE__*/ withTone(_CreditCard, 'CreditCard')
export const Database = /*#__PURE__*/ withTone(_Database, 'Database')
export const DollarSign = /*#__PURE__*/ withTone(_DollarSign, 'DollarSign')
export const Download = /*#__PURE__*/ withTone(_Download, 'Download')
export const Ellipsis = /*#__PURE__*/ withTone(_Ellipsis, 'Ellipsis')
export const ExternalLink = /*#__PURE__*/ withTone(_ExternalLink, 'ExternalLink')
export const Eye = /*#__PURE__*/ withTone(_Eye, 'Eye')
export const EyeOff = /*#__PURE__*/ withTone(_EyeOff, 'EyeOff')
export const File = /*#__PURE__*/ withTone(_File, 'File')
export const FileArchive = /*#__PURE__*/ withTone(_FileArchive, 'FileArchive')
export const FileImage = /*#__PURE__*/ withTone(_FileImage, 'FileImage')
export const FileInput = /*#__PURE__*/ withTone(_FileInput, 'FileInput')
export const FileSpreadsheet = /*#__PURE__*/ withTone(_FileSpreadsheet, 'FileSpreadsheet')
export const FileStack = /*#__PURE__*/ withTone(_FileStack, 'FileStack')
export const FileText = /*#__PURE__*/ withTone(_FileText, 'FileText')
export const Filter = /*#__PURE__*/ withTone(_Filter, 'Filter')
export const Flag = /*#__PURE__*/ withTone(_Flag, 'Flag')
export const Folder = /*#__PURE__*/ withTone(_Folder, 'Folder')
export const FolderInput = /*#__PURE__*/ withTone(_FolderInput, 'FolderInput')
export const FolderOpen = /*#__PURE__*/ withTone(_FolderOpen, 'FolderOpen')
export const FolderPlus = /*#__PURE__*/ withTone(_FolderPlus, 'FolderPlus')
export const FormInput = /*#__PURE__*/ withTone(_FormInput, 'FormInput')
export const Forward = /*#__PURE__*/ withTone(_Forward, 'Forward')
export const Gauge = /*#__PURE__*/ withTone(_Gauge, 'Gauge')
export const GitBranch = /*#__PURE__*/ withTone(_GitBranch, 'GitBranch')
export const GitMerge = /*#__PURE__*/ withTone(_GitMerge, 'GitMerge')
export const Globe = /*#__PURE__*/ withTone(_Globe, 'Globe')
export const Globe2 = /*#__PURE__*/ withTone(_Globe2, 'Globe2')
export const GraduationCap = /*#__PURE__*/ withTone(_GraduationCap, 'GraduationCap')
export const Grid3X3 = /*#__PURE__*/ withTone(_Grid3X3, 'Grid3X3')
export const GripVertical = /*#__PURE__*/ withTone(_GripVertical, 'GripVertical')
export const Hammer = /*#__PURE__*/ withTone(_Hammer, 'Hammer')
export const HardDrive = /*#__PURE__*/ withTone(_HardDrive, 'HardDrive')
export const Hash = /*#__PURE__*/ withTone(_Hash, 'Hash')
export const Heading = /*#__PURE__*/ withTone(_Heading, 'Heading')
export const Heart = /*#__PURE__*/ withTone(_Heart, 'Heart')
export const HeartHandshake = /*#__PURE__*/ withTone(_HeartHandshake, 'HeartHandshake')
export const HelpCircle = /*#__PURE__*/ withTone(_HelpCircle, 'HelpCircle')
export const History = /*#__PURE__*/ withTone(_History, 'History')
export const Home = /*#__PURE__*/ withTone(_Home, 'Home')
export const Hourglass = /*#__PURE__*/ withTone(_Hourglass, 'Hourglass')
export const IdCard = /*#__PURE__*/ withTone(_IdCard, 'IdCard')
export const Image = /*#__PURE__*/ withTone(_Image, 'Image')
export const ImagePlus = /*#__PURE__*/ withTone(_ImagePlus, 'ImagePlus')
export const Inbox = /*#__PURE__*/ withTone(_Inbox, 'Inbox')
export const Info = /*#__PURE__*/ withTone(_Info, 'Info')
export const Italic = /*#__PURE__*/ withTone(_Italic, 'Italic')
export const Kanban = /*#__PURE__*/ withTone(_Kanban, 'Kanban')
export const KeyRound = /*#__PURE__*/ withTone(_KeyRound, 'KeyRound')
export const Landmark = /*#__PURE__*/ withTone(_Landmark, 'Landmark')
export const Layers = /*#__PURE__*/ withTone(_Layers, 'Layers')
export const LayoutGrid = /*#__PURE__*/ withTone(_LayoutGrid, 'LayoutGrid')
export const LayoutList = /*#__PURE__*/ withTone(_LayoutList, 'LayoutList')
export const LayoutTemplate = /*#__PURE__*/ withTone(_LayoutTemplate, 'LayoutTemplate')
export const LineChart = /*#__PURE__*/ withTone(_LineChart, 'LineChart')
export const Link2 = /*#__PURE__*/ withTone(_Link2, 'Link2')
export const List = /*#__PURE__*/ withTone(_List, 'List')
export const ListChecks = /*#__PURE__*/ withTone(_ListChecks, 'ListChecks')
export const ListOrdered = /*#__PURE__*/ withTone(_ListOrdered, 'ListOrdered')
export const ListTodo = /*#__PURE__*/ withTone(_ListTodo, 'ListTodo')
export const ListTree = /*#__PURE__*/ withTone(_ListTree, 'ListTree')
export const Loader2 = /*#__PURE__*/ withTone(_Loader2, 'Loader2')
export const Lock = /*#__PURE__*/ withTone(_Lock, 'Lock')
export const LogOut = /*#__PURE__*/ withTone(_LogOut, 'LogOut')
export const Mail = /*#__PURE__*/ withTone(_Mail, 'Mail')
export const MailCheck = /*#__PURE__*/ withTone(_MailCheck, 'MailCheck')
export const MailOpen = /*#__PURE__*/ withTone(_MailOpen, 'MailOpen')
export const Map = /*#__PURE__*/ withTone(_Map, 'Map')
export const MapPin = /*#__PURE__*/ withTone(_MapPin, 'MapPin')
export const Maximize2 = /*#__PURE__*/ withTone(_Maximize2, 'Maximize2')
export const Megaphone = /*#__PURE__*/ withTone(_Megaphone, 'Megaphone')
export const Menu = /*#__PURE__*/ withTone(_Menu, 'Menu')
export const MessageCircle = /*#__PURE__*/ withTone(_MessageCircle, 'MessageCircle')
export const MessageSquare = /*#__PURE__*/ withTone(_MessageSquare, 'MessageSquare')
export const MessageSquarePlus = /*#__PURE__*/ withTone(_MessageSquarePlus, 'MessageSquarePlus')
export const Mic = /*#__PURE__*/ withTone(_Mic, 'Mic')
export const Minus = /*#__PURE__*/ withTone(_Minus, 'Minus')
export const MoreHorizontal = /*#__PURE__*/ withTone(_MoreHorizontal, 'MoreHorizontal')
export const MousePointerClick = /*#__PURE__*/ withTone(_MousePointerClick, 'MousePointerClick')
export const Music = /*#__PURE__*/ withTone(_Music, 'Music')
export const NotebookPen = /*#__PURE__*/ withTone(_NotebookPen, 'NotebookPen')
export const Palmtree = /*#__PURE__*/ withTone(_Palmtree, 'Palmtree')
export const PanelLeftClose = /*#__PURE__*/ withTone(_PanelLeftClose, 'PanelLeftClose')
export const PanelLeftOpen = /*#__PURE__*/ withTone(_PanelLeftOpen, 'PanelLeftOpen')
export const PanelRight = /*#__PURE__*/ withTone(_PanelRight, 'PanelRight')
export const Paperclip = /*#__PURE__*/ withTone(_Paperclip, 'Paperclip')
export const PartyPopper = /*#__PURE__*/ withTone(_PartyPopper, 'PartyPopper')
export const Pause = /*#__PURE__*/ withTone(_Pause, 'Pause')
export const PenLine = /*#__PURE__*/ withTone(_PenLine, 'PenLine')
export const Pencil = /*#__PURE__*/ withTone(_Pencil, 'Pencil')
export const PencilLine = /*#__PURE__*/ withTone(_PencilLine, 'PencilLine')
export const Percent = /*#__PURE__*/ withTone(_Percent, 'Percent')
export const Phone = /*#__PURE__*/ withTone(_Phone, 'Phone')
export const PhoneCall = /*#__PURE__*/ withTone(_PhoneCall, 'PhoneCall')
export const PhoneIncoming = /*#__PURE__*/ withTone(_PhoneIncoming, 'PhoneIncoming')
export const PhoneMissed = /*#__PURE__*/ withTone(_PhoneMissed, 'PhoneMissed')
export const PhoneOutgoing = /*#__PURE__*/ withTone(_PhoneOutgoing, 'PhoneOutgoing')
export const Play = /*#__PURE__*/ withTone(_Play, 'Play')
export const PlayCircle = /*#__PURE__*/ withTone(_PlayCircle, 'PlayCircle')
export const Plus = /*#__PURE__*/ withTone(_Plus, 'Plus')
export const Presentation = /*#__PURE__*/ withTone(_Presentation, 'Presentation')
export const Printer = /*#__PURE__*/ withTone(_Printer, 'Printer')
export const Puzzle = /*#__PURE__*/ withTone(_Puzzle, 'Puzzle')
export const Quote = /*#__PURE__*/ withTone(_Quote, 'Quote')
export const Receipt = /*#__PURE__*/ withTone(_Receipt, 'Receipt')
export const ReceiptText = /*#__PURE__*/ withTone(_ReceiptText, 'ReceiptText')
export const Redo2 = /*#__PURE__*/ withTone(_Redo2, 'Redo2')
export const RefreshCcw = /*#__PURE__*/ withTone(_RefreshCcw, 'RefreshCcw')
export const RefreshCw = /*#__PURE__*/ withTone(_RefreshCw, 'RefreshCw')
export const RemoveFormatting = /*#__PURE__*/ withTone(_RemoveFormatting, 'RemoveFormatting')
export const Repeat = /*#__PURE__*/ withTone(_Repeat, 'Repeat')
export const Reply = /*#__PURE__*/ withTone(_Reply, 'Reply')
export const ReplyAll = /*#__PURE__*/ withTone(_ReplyAll, 'ReplyAll')
export const Rocket = /*#__PURE__*/ withTone(_Rocket, 'Rocket')
export const RotateCcw = /*#__PURE__*/ withTone(_RotateCcw, 'RotateCcw')
export const Route = /*#__PURE__*/ withTone(_Route, 'Route')
export const Save = /*#__PURE__*/ withTone(_Save, 'Save')
export const Scale = /*#__PURE__*/ withTone(_Scale, 'Scale')
export const ScanLine = /*#__PURE__*/ withTone(_ScanLine, 'ScanLine')
export const ScrollText = /*#__PURE__*/ withTone(_ScrollText, 'ScrollText')
export const Search = /*#__PURE__*/ withTone(_Search, 'Search')
export const Send = /*#__PURE__*/ withTone(_Send, 'Send')
export const Settings = /*#__PURE__*/ withTone(_Settings, 'Settings')
export const Settings2 = /*#__PURE__*/ withTone(_Settings2, 'Settings2')
export const Shield = /*#__PURE__*/ withTone(_Shield, 'Shield')
export const ShieldCheck = /*#__PURE__*/ withTone(_ShieldCheck, 'ShieldCheck')
export const ShoppingBag = /*#__PURE__*/ withTone(_ShoppingBag, 'ShoppingBag')
export const ShoppingCart = /*#__PURE__*/ withTone(_ShoppingCart, 'ShoppingCart')
export const Shuffle = /*#__PURE__*/ withTone(_Shuffle, 'Shuffle')
export const Signal = /*#__PURE__*/ withTone(_Signal, 'Signal')
export const SlidersHorizontal = /*#__PURE__*/ withTone(_SlidersHorizontal, 'SlidersHorizontal')
export const Smartphone = /*#__PURE__*/ withTone(_Smartphone, 'Smartphone')
export const Sparkles = /*#__PURE__*/ withTone(_Sparkles, 'Sparkles')
export const SquareKanban = /*#__PURE__*/ withTone(_SquareKanban, 'SquareKanban')
export const Star = /*#__PURE__*/ withTone(_Star, 'Star')
export const StickyNote = /*#__PURE__*/ withTone(_StickyNote, 'StickyNote')
export const Tag = /*#__PURE__*/ withTone(_Tag, 'Tag')
export const Target = /*#__PURE__*/ withTone(_Target, 'Target')
export const ThumbsDown = /*#__PURE__*/ withTone(_ThumbsDown, 'ThumbsDown')
export const Timer = /*#__PURE__*/ withTone(_Timer, 'Timer')
export const Trash2 = /*#__PURE__*/ withTone(_Trash2, 'Trash2')
export const TrendingDown = /*#__PURE__*/ withTone(_TrendingDown, 'TrendingDown')
export const TrendingUp = /*#__PURE__*/ withTone(_TrendingUp, 'TrendingUp')
export const Trophy = /*#__PURE__*/ withTone(_Trophy, 'Trophy')
export const Truck = /*#__PURE__*/ withTone(_Truck, 'Truck')
export const Type = /*#__PURE__*/ withTone(_Type, 'Type')
export const Umbrella = /*#__PURE__*/ withTone(_Umbrella, 'Umbrella')
export const Underline = /*#__PURE__*/ withTone(_Underline, 'Underline')
export const Undo2 = /*#__PURE__*/ withTone(_Undo2, 'Undo2')
export const Unlink2 = /*#__PURE__*/ withTone(_Unlink2, 'Unlink2')
export const Upload = /*#__PURE__*/ withTone(_Upload, 'Upload')
export const User = /*#__PURE__*/ withTone(_User, 'User')
export const UserCheck = /*#__PURE__*/ withTone(_UserCheck, 'UserCheck')
export const UserCircle = /*#__PURE__*/ withTone(_UserCircle, 'UserCircle')
export const UserCircle2 = /*#__PURE__*/ withTone(_UserCircle2, 'UserCircle2')
export const UserCog = /*#__PURE__*/ withTone(_UserCog, 'UserCog')
export const UserMinus = /*#__PURE__*/ withTone(_UserMinus, 'UserMinus')
export const UserPlus = /*#__PURE__*/ withTone(_UserPlus, 'UserPlus')
export const UserRound = /*#__PURE__*/ withTone(_UserRound, 'UserRound')
export const UserRoundCheck = /*#__PURE__*/ withTone(_UserRoundCheck, 'UserRoundCheck')
export const UserX = /*#__PURE__*/ withTone(_UserX, 'UserX')
export const Users = /*#__PURE__*/ withTone(_Users, 'Users')
export const UsersRound = /*#__PURE__*/ withTone(_UsersRound, 'UsersRound')
export const Video = /*#__PURE__*/ withTone(_Video, 'Video')
export const Wallet = /*#__PURE__*/ withTone(_Wallet, 'Wallet')
export const Waypoints = /*#__PURE__*/ withTone(_Waypoints, 'Waypoints')
export const Wifi = /*#__PURE__*/ withTone(_Wifi, 'Wifi')
export const Workflow = /*#__PURE__*/ withTone(_Workflow, 'Workflow')
export const X = /*#__PURE__*/ withTone(_X, 'X')
export const XCircle = /*#__PURE__*/ withTone(_XCircle, 'XCircle')
export const Zap = /*#__PURE__*/ withTone(_Zap, 'Zap')
export const ZoomIn = /*#__PURE__*/ withTone(_ZoomIn, 'ZoomIn')
export const ZoomOut = /*#__PURE__*/ withTone(_ZoomOut, 'ZoomOut')
