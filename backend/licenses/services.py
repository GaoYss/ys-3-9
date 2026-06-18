from django.db.models import Count, Q
from django.utils import timezone

from .models import BorrowRecord, License


def refresh_license_status(license_obj):
    computed_status = license_obj.computed_status
    if license_obj.status != computed_status:
        license_obj.status = computed_status
        license_obj.save(update_fields=["status", "updated_at"])
    return license_obj


def refresh_borrow_status(record):
    computed_status = record.computed_status
    if record.status != computed_status:
        record.status = computed_status
        record.save(update_fields=["status", "updated_at"])
    return record


def dashboard_stats():
    today = timezone.localdate()
    licenses = list(License.objects.all())
    for license_obj in licenses:
        refresh_license_status(license_obj)

    borrow_records = list(BorrowRecord.objects.filter(status__in=[BorrowRecord.Status.BORROWED, BorrowRecord.Status.OVERDUE]))
    for record in borrow_records:
        refresh_borrow_status(record)

    status_counts = dict(License.objects.values_list("status").annotate(total=Count("id")))
    type_counts = dict(License.objects.values_list("license_type").annotate(total=Count("id")))

    return {
        "total_licenses": License.objects.count(),
        "active_licenses": status_counts.get(License.Status.ACTIVE, 0),
        "expiring_licenses": status_counts.get(License.Status.EXPIRING, 0),
        "expired_licenses": status_counts.get(License.Status.EXPIRED, 0),
        "borrowed_records": BorrowRecord.objects.filter(status=BorrowRecord.Status.BORROWED).count(),
        "overdue_returns": BorrowRecord.objects.filter(status=BorrowRecord.Status.OVERDUE).count(),
        "by_type": type_counts,
        "upcoming_expiries": License.objects.filter(expiry_date__gte=today).order_by("expiry_date")[:8],
        "expired": License.objects.filter(expiry_date__lt=today).order_by("expiry_date")[:8],
    }


def department_stats():
    today = timezone.localdate()
    licenses = list(License.objects.all())
    for license_obj in licenses:
        refresh_license_status(license_obj)

    borrow_records = list(BorrowRecord.objects.filter(status__in=[BorrowRecord.Status.BORROWED, BorrowRecord.Status.OVERDUE]))
    for record in borrow_records:
        refresh_borrow_status(record)

    departments = License.objects.values_list("owner_department", flat=True).distinct().order_by("owner_department")
    result = []

    borrowed_licenses = set(
        BorrowRecord.objects.filter(status__in=[BorrowRecord.Status.BORROWED, BorrowRecord.Status.OVERDUE])
        .values_list("license_id", flat=True)
    )

    for dept in departments:
        dept_licenses = License.objects.filter(owner_department=dept)
        total_count = dept_licenses.count()
        expiring_count = dept_licenses.filter(status=License.Status.EXPIRING).count()
        expired_count = dept_licenses.filter(status=License.Status.EXPIRED).count()
        active_count = dept_licenses.filter(status=License.Status.ACTIVE).count()
        archived_count = dept_licenses.filter(status=License.Status.ARCHIVED).count()

        dept_license_ids = dept_licenses.values_list("id", flat=True)
        borrowed_count = len(set(dept_license_ids) & borrowed_licenses)

        license_list = []
        for lic in dept_licenses:
            is_borrowed = lic.id in borrowed_licenses
            borrow_info = None
            if is_borrowed:
                borrow_record = BorrowRecord.objects.filter(
                    license=lic, status__in=[BorrowRecord.Status.BORROWED, BorrowRecord.Status.OVERDUE]
                ).first()
                if borrow_record:
                    borrow_info = {
                        "borrower": borrow_record.borrower,
                        "borrower_department": borrow_record.borrower_department,
                        "borrow_date": borrow_record.borrow_date,
                        "expected_return_date": borrow_record.expected_return_date,
                        "status": borrow_record.status,
                        "status_display": borrow_record.get_status_display(),
                    }
            license_list.append({
                "id": lic.id,
                "name": lic.name,
                "license_no": lic.license_no,
                "license_type": lic.license_type,
                "license_type_display": lic.get_license_type_display(),
                "status": lic.status,
                "status_display": lic.get_status_display(),
                "expiry_date": lic.expiry_date,
                "days_until_expiry": lic.days_until_expiry,
                "is_borrowed": is_borrowed,
                "borrow_info": borrow_info,
            })

        result.append({
            "department": dept,
            "total_licenses": total_count,
            "active_licenses": active_count,
            "expiring_licenses": expiring_count,
            "expired_licenses": expired_count,
            "archived_licenses": archived_count,
            "borrowed_licenses": borrowed_count,
            "licenses": license_list,
        })

    return result
