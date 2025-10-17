"use client"

import React, { createContext, useContext, useState, ReactNode, forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, PanelLeft } from 'lucide-react';

interface SidebarContextProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  closeMobileSidebar: () => void;
  openMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isCollapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(prev => !prev);
  };
  
  const closeMobileSidebar = () => setMobileOpen(false);
  const openMobileSidebar = () => setMobileOpen(true);


  return (
    <SidebarContext.Provider value={{ isCollapsed, isMobileOpen, toggleSidebar, closeMobileSidebar, openMobileSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

const sidebarVariants = cva(
  "fixed top-0 left-0 z-40 h-screen bg-card text-card-foreground border-r transition-all duration-300 ease-in-out",
  {
    variants: {
      collapsed: {
        true: "w-16",
        false: "w-64",
      },
    },
    defaultVariants: {
      collapsed: false,
    },
  }
);

interface SidebarProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: ReactNode;
}

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, children, ...props }, ref) => {
    const { isCollapsed, isMobileOpen, closeMobileSidebar } = useSidebar();
    return (
        <>
            <aside
                ref={ref}
                className={cn(
                    'hidden md:flex flex-col',
                    sidebarVariants({ collapsed: isCollapsed }),
                    className
                )}
                data-collapsible={isCollapsed ? 'icon' : 'full'}
                {...props}
            >
                {children}
            </aside>
            {isMobileOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={closeMobileSidebar} />}
            <aside
                ref={ref}
                className={cn(
                    'flex md:hidden flex-col fixed top-0 left-0 z-40 h-screen w-64 bg-card text-card-foreground border-r transition-transform duration-300 ease-in-out',
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full',
                    className
                )}
                data-collapsible="full"
                {...props}
            >
                 <SidebarClose className="absolute right-4 top-4" />
                {children}
            </aside>
        </>
    );
  }
);
Sidebar.displayName = 'Sidebar';


export const SidebarHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-16 items-center border-b px-4 shrink-0", className)}
      {...props}
    />
  )
);
SidebarHeader.displayName = 'SidebarHeader';

export const SidebarContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1 overflow-y-auto overflow-x-hidden", className)}
      {...props}
    />
  )
);
SidebarContent.displayName = 'SidebarContent';

export const SidebarMenu = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col p-2 space-y-1", className)}
      {...props}
    />
  )
);
SidebarMenu.displayName = 'SidebarMenu';

export const SidebarMenuItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return <div ref={ref} role="menuitem" {...props} />;
  }
);
SidebarMenuItem.displayName = 'SidebarMenuItem';

const sidebarMenuButtonVariants = cva(
  "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors justify-start",
  {
    variants: {
      isActive: {
        true: "bg-primary text-primary-foreground",
        false: "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
      },
    },
    defaultVariants: {
      isActive: false,
    },
  }
);

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof sidebarMenuButtonVariants> {
  asChild?: boolean;
  tooltip?: string;
}

export const SidebarMenuButton = forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, isActive, asChild = false, tooltip, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const { isCollapsed } = useSidebar();
    
    const buttonContent = (
      <Comp
        className={cn(sidebarMenuButtonVariants({ isActive }), "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0", className)}
        ref={ref}
        {...props}
      />
    );

    if (isCollapsed) {
      return (
        <TooltipProvider>
            <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
                {buttonContent}
            </TooltipTrigger>
            <TooltipContent side="right">
                {tooltip}
            </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      );
    }
    
    return buttonContent;
  }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';


export const SidebarFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mt-auto border-t p-2", className)}
      {...props}
    />
  )
);
SidebarFooter.displayName = 'SidebarFooter';

export const SidebarInset = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { isCollapsed } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn('flex flex-col transition-all duration-300 ease-in-out md:ml-16',
          isCollapsed ? 'md:ml-16' : 'md:ml-64', className
        )}
        {...props}
      />
    );
  }
);
SidebarInset.displayName = 'SidebarInset';


export const SidebarTrigger = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  (props, ref) => {
    const { openMobileSidebar } = useSidebar();
    return (
      <button ref={ref} onClick={openMobileSidebar} {...props}>
        <PanelLeft />
      </button>
    );
  }
);
SidebarTrigger.displayName = 'SidebarTrigger';

export const SidebarClose = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  (props, ref) => {
    const { closeMobileSidebar } = useSidebar();
    return (
      <button ref={ref} onClick={closeMobileSidebar} {...props}>
        <X />
      </button>
    );
  }
);
SidebarClose.displayName = 'SidebarClose';
