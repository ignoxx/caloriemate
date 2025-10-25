import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Clock, Footprints } from "lucide-react";
import type { ActivityLogsResponse } from "../types/pocketbase-types";

interface ActivityCardProps {
  activity: ActivityLogsResponse;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const timeString = new Date(activity.created).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Card className="transition-shadow bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900/50">
      <CardContent className="p-1">
        <div className="flex gap-3 items-center">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-green-100 dark:bg-green-900/40 flex-shrink-0 flex items-center justify-center">
            <Footprints className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-sm text-foreground">
                Walking
              </h3>
            </div>

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200 dark:bg-green-900/60 dark:text-green-300 dark:border-green-800">
                -{activity.calories_burned} kcal
              </Badge>
              {activity.steps > 0 && (
                <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                  {activity.steps.toLocaleString()} steps
                </Badge>
              )}
              {activity.duration_minutes > 0 && (
                <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                  {activity.duration_minutes} min
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {timeString}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
