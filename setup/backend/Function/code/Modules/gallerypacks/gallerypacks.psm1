# This module has functions to manage packs that have gallery components
# How to find if a pack has a gallery component? Maybe gallery applications have tags.
# When adding the tag an creating associated mappings, we need to check if there is an application in the gallery with the same tag.
# If so, also install the application in the VM.

function New-vmApp { 
    param (
        [Parameter(Mandatory = $true)]
        [string]$instanceName,
        [Parameter(Mandatory = $true)]
        [string]$packtag,
        [Parameter(Mandatory = $true)]
        [string]$resourceId # VM Resource ID to receive the application
    )
    #Find gallery by instanceName tag
    $gallery=Get-AzGallery | Where-Object { $_.Tags.instanceName -eq $instanceName }
    # Find gallery application by packtag (retry up to 3 times for newly created apps)
    $galleryapplications=$null
    $maxRetries=3
    for ($attempt=1; $attempt -le $maxRetries; $attempt++) {
        $galleryapplications=(Get-AzGalleryApplication -GalleryName $gallery.Name -ResourceGroupName $gallery.ResourceGroupName) | Where-Object {$_.Tag.AdditionalProperties.MonitorStarterPacks -eq $packtag}
        if ($galleryapplications.Count -gt 0) { break }
        if ($attempt -lt $maxRetries) {
            Write-Host "No gallery applications found for $($packtag) (attempt $attempt/$maxRetries). Retrying in 30 seconds..."
            Start-Sleep -Seconds 30
        }
    }
    if ($galleryapplications.Count -eq 0) {
        Write-Warning "No gallery applications found for $($packtag) after $maxRetries attempts. No need to install."
        return $true
    }
    foreach ($ga in $galleryapplications) {
        # get latest application version
        $appversion=(Get-AzGalleryApplicationVersion -GalleryApplicationName $galleryapplications.Name -GalleryName $gallery.Name -ResourceGroupName $gallery.ResourceGroupName | Sort-Object -Descending PublishingProfilePublishedDate)[0]
        # install version to VM

        if ($appversion) {
            $VM=Get-AzVM -ResourceId $resourceId
            # check if VM already has the application with the same version installed
            if (!($VM.ApplicationProfile.GalleryApplications)) {
                Write-Host "No applications installed in $($resourceId)."
            }
            else{
                $installedApp=$VM.ApplicationProfile.GalleryApplications | Where-Object { $_.PackageReferenceId.Contains($ga.id)} -ErrorAction SilentlyContinue
                if ($installedApp) {
                    Write-Warning "Application $($ga.Name) version $($installedApp.PublishingProfile.PublishedDate) already installed in $($resourceId)."
                    return $true
                }
            }
            Write-Host "Installing $($appversion.Name) version $($appversion.PublishingProfile.PublishedDate) to $($resourceId)"
        }
        else {
            Write-Error "No application version found"
            return $false
        }
        $newAppConfig=New-AzVmGalleryApplication -PackageReferenceId $appversion.Id
        if ($VM) {
            Add-AzVmGalleryApplication -VM $VM -GalleryApplication $newAppConfig -TreatFailureAsDeploymentFailure
            $installRetries = 3
            for ($installAttempt = 1; $installAttempt -le $installRetries; $installAttempt++) {
                try {
                    $VM | Update-AzVM
                    Write-Host "Installed $($appversion.Name) version $($appversion.PublishingProfile.PublishedDate) to $($resourceId)"
                    return $true
                }
                catch {
                    if ($_.Exception.Message -match 'ApplicationNotFound' -and $installAttempt -lt $installRetries) {
                        Write-Host "Application version not yet available (attempt $installAttempt/$installRetries). Retrying in 30 seconds..."
                        Start-Sleep -Seconds 30
                        $VM = Get-AzVM -ResourceId $resourceId
                        Add-AzVmGalleryApplication -VM $VM -GalleryApplication $newAppConfig -TreatFailureAsDeploymentFailure
                    }
                    else {
                        Write-Error "Error installing application $($appversion.Name) version $($appversion.PublishingProfile.PublishedDate) to $($resourceId): $_"
                        return $false
                    }
                }
            }
        }
        else {
            Write-Error "VM not found"
            return $false
        }
    }
    return $true
}
function remove-vmapp {
    param (
        [Parameter(Mandatory = $true)]
        [string]$resourceId, # VM Resource ID to delete the application from.
        [Parameter(Mandatory = $true)]
        [string]$packtag,
        [Parameter(Mandatory = $true)]
        [string]$instanceName
    )
    Write-Host "Removing VM Application from $instanceName instance for $packtag pack on $resourceId"
    #find application related to the tag
    # remove the application from the VM
    Write-host "Fetching gallery."
    $gallery=Get-AzGallery | Where-Object { $_.Tags.instanceName -eq $instanceName }
    if ($null -eq $gallery) {
        Write-Host "Gallery not found for instance $instanceName"
    }
    # Find gallery application by packtag
    Write-host "Fetching applications that match pack and belong to the packs"
    $galleryapplications=(Get-AzGalleryApplication -GalleryName $gallery.Name -ResourceGroupName $gallery.ResourceGroupName) | Where-Object {$_.Tag.AdditionalProperties.MonitorStarterPacks -eq $packtag }
    if ($galleryapplications.Count -eq 0) {
        Write-Warning "No gallery applications found for $($packtag). No need to install."
        return $false
    }
    foreach ($ga in $galleryapplications) {
        # get latest application version
        #$appversion=(Get-AzGalleryApplicationVersion -GalleryApplicationName $galleryapplications.Name -GalleryName $gallery.Name -ResourceGroupName $gallery.ResourceGroupName | Sort-Object -Descending PublishingProfilePublishedDate)[0]
        # install version to VM
        #
        $VM=Get-AzVM -ResourceId $resourceId
        if ($VM) {
            if (!($VM.ApplicationProfile.GalleryApplications)) {
                Write-Host "No applications installed on $($resourceId). Skipping removal of $($ga.Name)."
                continue
            }
            $installedApp = $VM.ApplicationProfile.GalleryApplications | Where-Object { $_.PackageReferenceId -and $_.PackageReferenceId.ToLower().Contains($ga.id.ToLower()) }
            if (!$installedApp) {
                Write-Host "Application $($ga.Name) not found on $($resourceId). Skipping."
                continue
            }
            Write-host "Removing $($ga.Name) from $($resourceId)"
            try {
                Remove-AzVmGalleryApplication -VM $VM -GalleryApplicationsReferenceId $installedApp.PackageReferenceId
                $VM | Update-AzVM
            }
            catch {
                Write-Error "Error removing application $($ga.Name) from $($resourceId)"
                return $false
            }
        }
        else {
            Write-Error "VM not found"
            return $false
        }
    }
    return $true
}