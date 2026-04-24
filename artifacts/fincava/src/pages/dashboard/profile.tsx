import { useGetMe } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChangePasswordCard } from "@/components/change-password-card";

export default function BuyerProfile() {
  const { data: user, isLoading } = useGetMe();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-64 w-full max-w-2xl rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and company details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name</label>
              <Input defaultValue={user?.firstName} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <Input defaultValue={user?.lastName} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input defaultValue={user?.email} disabled />
            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Country</label>
            <Input defaultValue={user?.country || ""} />
          </div>
          <Button className="mt-4">Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>Information about your purchasing organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Company Name</label>
            <Input defaultValue={user?.companyName || ""} />
          </div>
          <Button className="mt-4">Save Company Details</Button>
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}
