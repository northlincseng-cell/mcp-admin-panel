import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

// Pages
import Dashboard from "@/pages/Dashboard";
import Retailers from "@/pages/Retailers";
import RetailerDetail from "@/pages/RetailerDetail";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Offers from "@/pages/Offers";
import Countries from "@/pages/Countries";
import Deals from "@/pages/Deals";
import VolumeTiers from "@/pages/VolumeTiers";
import GsPricing from "@/pages/GsPricing";
import Equivalence from "@/pages/Equivalence";
import ValueProtection from "@/pages/ValueProtection";
import DealScoring from "@/pages/DealScoring";
import CarbonMarkets from "@/pages/CarbonMarkets";
import C2050Feed from "@/pages/C2050Feed";
import RegulatoryUpdates from "@/pages/RegulatoryUpdates";
import SystemStatus from "@/pages/SystemStatus";
import ChangeLog from "@/pages/ChangeLog";
import Approvals from "@/pages/Approvals";

function AppRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/retailers" component={Retailers} />
        <Route path="/retailers/:id" component={RetailerDetail} />
        <Route path="/products" component={Products} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/offers" component={Offers} />
        <Route path="/countries" component={Countries} />
        <Route path="/deals" component={Deals} />
        <Route path="/tiers" component={VolumeTiers} />
        <Route path="/pricing" component={GsPricing} />
        <Route path="/equivalence" component={Equivalence} />
        <Route path="/protection" component={ValueProtection} />
        <Route path="/scoring" component={DealScoring} />
        <Route path="/markets" component={CarbonMarkets} />
        <Route path="/streams" component={C2050Feed} />
        <Route path="/regulatory" component={RegulatoryUpdates} />
        <Route path="/status" component={SystemStatus} />
        <Route path="/changelog" component={ChangeLog} />
        <Route path="/approvals" component={Approvals} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
