import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetsOverviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: any[];
  selectedAsset: any;
  onSelectAsset: (asset: any) => void;
}

const AssetsOverviewDialog = ({
  open,
  onOpenChange,
  assets,
  selectedAsset,
  onSelectAsset,
}: AssetsOverviewDialogProps) => {
  const [selectedCategory, setSelectedCategory] = useState<'crypto' | 'stocks' | 'forex'>('crypto');
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favorite_assets');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  // Save favorites to localStorage
  const toggleFavorite = (assetId: string) => {
    const newFavorites = favorites.includes(assetId)
      ? favorites.filter(id => id !== assetId)
      : [...favorites, assetId];
    
    setFavorites(newFavorites);
    localStorage.setItem('favorite_assets', JSON.stringify(newFavorites));
  };

  const handleSelectAsset = (asset: any) => {
    onSelectAsset(asset);
    onOpenChange(false);
  };

  // Filter assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesCategory = asset.category === selectedCategory;
      const matchesSearch = searchQuery === "" || 
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [assets, selectedCategory, searchQuery]);

  const favoriteAssets = useMemo(() => {
    return assets.filter(asset => favorites.includes(asset.id));
  }, [assets, favorites]);

  const categories = [
    { id: 'crypto' as const, label: 'Crypto' },
    { id: 'stocks' as const, label: 'Stocks' },
    { id: 'forex' as const, label: 'Forex' },
  ];

  const AssetItem = ({ asset }: { asset: any }) => {
    const isFavorite = favorites.includes(asset.id);
    const isSelected = selectedAsset?.id === asset.id;
    
    return (
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
          "hover:bg-secondary/50",
          isSelected && "bg-primary/10 border border-primary"
        )}
        onClick={() => handleSelectAsset(asset)}
      >
        <div className="flex-1">
          <div className="font-semibold text-sm">{asset.symbol}</div>
          <div className="text-xs text-muted-foreground">{asset.name}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(asset.id);
          }}
          className={cn(
            "p-2 rounded-md transition-colors",
            isFavorite ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
          )}
        >
          <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
        </button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Přehled aktiv</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search and filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Hledat aktivum..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              {categories.map(({ id, label }) => (
                <Button
                  key={id}
                  variant={selectedCategory === id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(id)}
                  size="sm"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Assets list */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Favorites */}
            {favoriteAssets.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                  Oblíbené
                </h3>
                <div className="space-y-1">
                  {favoriteAssets.map(asset => (
                    <AssetItem key={asset.id} asset={asset} />
                  ))}
                </div>
              </div>
            )}

            {/* Category assets */}
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                {categories.find(c => c.id === selectedCategory)?.label}
              </h3>
              <div className="space-y-1">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map(asset => (
                    <AssetItem key={asset.id} asset={asset} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Žádná aktiva nenalezena
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssetsOverviewDialog;
